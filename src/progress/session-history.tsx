import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense, useState } from 'react';

import type { Locale, SessionSummary } from '../app-state/app-state';
import { SectionTitle } from '../ui/section-title';

import { withinDays } from './session-series';

/** Charting is a large dependency for one panel, so it arrives with the panel. */
const SessionChart = lazy(() => import('./session-chart'));

/** null keeps every stored session; the store caps history at 100. */
const RANGES: readonly { id: string; days: number | null }[] = [
  { id: '10d', days: 10 },
  { id: '30d', days: 30 },
  { id: 'all', days: null },
];

export function SessionHistory({
  sessions,
  locale,
}: {
  sessions: SessionSummary[];
  locale: Locale;
}) {
  const { t } = useLingui();
  const [range, setRange] = useState('30d');
  // One clock reading for the panel: ranges are day-sized, so it need not follow the tick.
  const [now] = useState(() => Date.now());
  const days = RANGES.find((option) => option.id === range)?.days ?? null;
  const shown = days === null ? sessions : withinDays(sessions, days, now);
  return (
    <>
      <div className="card-head">
        <SectionTitle title={t`Accuracy and speed`} />
        {sessions.length ? (
          <div
            className="range-picker"
            role="group"
            aria-label={t`Sessions shown`}
          >
            {RANGES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={option.id === range ? 'is-selected' : ''}
                aria-pressed={option.id === range}
                onClick={() => {
                  setRange(option.id);
                }}
              >
                {option.days === null ? t`All` : t`${option.days}d`}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {sessions.length ? (
        <Suspense fallback={<div className="chart-placeholder" />}>
          <SessionChart sessions={shown} locale={locale} />
        </Suspense>
      ) : (
        <p className="muted-copy">{t`Finished sessions will appear here as a run of accuracy and speed.`}</p>
      )}
    </>
  );
}
