import { Plural, useLingui } from '@lingui/react/macro';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Locale } from '../app-state/app-state';

import type { DayPoint } from './dashboard-stats';

/**
 * Recharts hoists dots into a shared layer outside each line's class group, so per-series
 * colour cannot come from CSS. The tokens are passed as props and resolve per theme.
 */
const ACCURACY_INK = 'var(--accent)';
const RESPONSE_INK = 'var(--warning)';
const VOLUME_INK = 'var(--surface-secondary)';

type Point = DayPoint & { label: string };

function shortDate(day: string, locale: Locale) {
  return new Date(`${day}T12:00`).toLocaleDateString(
    locale === 'ru' ? 'ru-RU' : 'en-GB',
    { day: 'numeric', month: 'short' },
  );
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
        <Plural value={point.attempts} one="# note" other="# notes" />
      </span>
    </div>
  );
}

export default function SessionChart({
  days,
  locale,
}: {
  days: DayPoint[];
  locale: Locale;
}) {
  const { t } = useLingui();
  const data: Point[] = days.map((point) => ({
    ...point,
    label: shortDate(point.day, locale),
  }));
  // Dots turn into noise once the run is long; the hover dot still marks the reading.
  const dots = data.length <= 20;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart
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
            tickFormatter={(value: number) => `${String(value)}%`}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <YAxis
            yAxisId="response"
            orientation="right"
            domain={[0, (max: number) => Math.max(1, Math.ceil(max))]}
            tickFormatter={(value: number) =>
              `${String(value)}${locale === 'ru' ? 'с' : 's'}`
            }
            tickLine={false}
            axisLine={false}
            width={34}
          />
          {/* Scaled down so volume stays a backdrop rather than a third reading. */}
          <YAxis yAxisId="volume" hide domain={[0, (max: number) => max * 4]} />
          <Tooltip
            cursor={{ strokeDasharray: '2 4' }}
            content={<ChartTooltip locale={locale} />}
          />
          {/* A lone answer should not read like a bad day, so volume sits behind the rates. */}
          <Bar
            yAxisId="volume"
            dataKey="attempts"
            fill={VOLUME_INK}
            isAnimationActive={false}
            radius={[3, 3, 0, 0]}
            maxBarSize={26}
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
        </ComposedChart>
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
        <li className="is-volume">
          <span className="chart-key" aria-hidden="true" />
          {t`Notes answered`}
        </li>
      </ul>
    </div>
  );
}
