import { useLingui } from '@lingui/react/macro';

import type { MasteryState, NoteStats } from '../training/training';

import { MASTERY_STATE_LABELS } from './mastery-labels';

/** Ordered from the most advanced state down, so the bar reads as progress earned. */
const BAND_ORDER: readonly MasteryState[] = ['fluent', 'recognized', 'new'];

export function MasteryBand({ notes }: { notes: NoteStats[] }) {
  const { t } = useLingui();
  const counts = BAND_ORDER.map((state) => ({
    state,
    count: notes.filter((note) => note.state === state).length,
  }));
  const total = notes.length || 1;
  const fluent = counts[0].count;
  return (
    <section className="surface mastery-band">
      <p className="mastery-headline">
        <strong>{fluent}</strong>
        <span>{t`of ${notes.length} notes read fluently`}</span>
      </p>
      <div className="mastery-track" role="presentation">
        {counts.map(({ state, count }) =>
          count ? (
            <span
              key={state}
              className={`mastery-fill state-${state}`}
              style={{ width: `${(count / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mastery-legend">
        {counts.map(({ state, count }) => (
          <li key={state}>
            <span className={`mastery-dot state-${state}`} aria-hidden="true" />
            {t(MASTERY_STATE_LABELS[state])}
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
