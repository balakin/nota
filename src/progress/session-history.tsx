import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense } from 'react';

import type { Locale } from '../app-state/app-state';

import type { DayPoint } from './dashboard-stats';

/** Charting is a large dependency for one panel, so it arrives with the panel. */
const SessionChart = lazy(() => import('./session-chart'));

export function SessionHistory({
  days,
  locale,
}: {
  days: DayPoint[];
  locale: Locale;
}) {
  const { t } = useLingui();
  if (!days.length)
    return (
      <p className="muted-copy">{t`No practice in this range yet. Train, and accuracy and speed will appear here day by day.`}</p>
    );
  return (
    <Suspense fallback={<div className="chart-placeholder" />}>
      <SessionChart days={days} locale={locale} />
    </Suspense>
  );
}
