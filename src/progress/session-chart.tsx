import { Plural, useLingui } from '@lingui/react/macro';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Locale, SessionSummary } from '../app-state/app-state';

import { sessionsByDay, type DayPoint } from './session-series';

/**
 * Recharts hoists dots into a shared layer outside each line's class group, so per-series
 * colour cannot come from CSS. The tokens are passed as props and resolve per theme.
 */
const ACCURACY_INK = 'var(--accent)';
const RESPONSE_INK = 'var(--warning)';

type Point = DayPoint & { label: string };

function shortDate(at: number, locale: Locale) {
  return new Date(at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function ChartTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  locale: Locale;
}) {
  const { t } = useLingui();
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="chart-tip">
      <strong>{point.label}</strong>
      <span className="chart-tip-row is-accuracy">
        {point.accuracy}% <small>{t`accuracy`}</small>
      </span>
      <span className="chart-tip-row is-response">
        {point.seconds === null
          ? '—'
          : `${point.seconds.toFixed(1)}${locale === 'ru' ? ' с' : 's'}`}{' '}
        <small>{t`per note`}</small>
      </span>
      <span className="chart-tip-mode">
        {point.attempts} {t`notes`} ·{' '}
        <Plural value={point.sessions} one="# session" other="# sessions" />
      </span>
    </div>
  );
}

export default function SessionChart({
  sessions,
  locale,
}: {
  sessions: SessionSummary[];
  locale: Locale;
}) {
  const { t } = useLingui();
  // One point per day, in date order, however many sessions that day held.
  const data: Point[] = sessionsByDay(sessions).map((point) => ({
    ...point,
    label: shortDate(point.at, locale),
  }));
  // Dots turn into noise once the run is long; the hover dot still marks the reading.
  const dots = data.length <= 20;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={196}>
        <LineChart
          data={data}
          margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={14}
          />
          <YAxis
            yAxisId="accuracy"
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <YAxis
            yAxisId="response"
            orientation="right"
            domain={[0, (max: number) => Math.max(1, Math.ceil(max))]}
            tickFormatter={(value: number) =>
              `${value}${locale === 'ru' ? 'с' : 's'}`
            }
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            cursor={{ strokeDasharray: '2 4' }}
            content={<ChartTooltip locale={locale} />}
          />
          <Line
            yAxisId="accuracy"
            type="monotone"
            dataKey="accuracy"
            stroke={ACCURACY_INK}
            strokeWidth={2}
            dot={dots && { r: 3, strokeWidth: 2, stroke: ACCURACY_INK }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: ACCURACY_INK }}
          />
          <Line
            yAxisId="response"
            type="monotone"
            dataKey="seconds"
            stroke={RESPONSE_INK}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={dots && { r: 3, strokeWidth: 2, stroke: RESPONSE_INK }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: RESPONSE_INK }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <ul className="chart-legend">
        <li className="is-accuracy">
          <span className="chart-key" aria-hidden="true" />
          {t`Accuracy`}
        </li>
        <li className="is-response">
          <span className="chart-key" aria-hidden="true" />
          {t`Time per note`}
        </li>
      </ul>
    </div>
  );
}
