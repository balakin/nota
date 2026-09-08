import { useLingui } from '@lingui/react/macro';

import type { Locale } from '../app-state/app-state';
import { decimalMark } from '../i18n/i18n';
import type { PracticeMode } from '../training/training';
import { formatSeconds } from '../utils/format';

/**
 * The aside explains whichever mode is selected, so the difference between the
 * two is readable before a session starts rather than discovered inside one.
 */
export function ModeExplainer({
  mode,
  speedDeadlineMs,
  locale,
}: {
  mode: PracticeMode;
  speedDeadlineMs: number;
  locale: Locale;
}) {
  const { t } = useLingui();
  const mark = decimalMark(locale);
  const speed = formatSeconds(speedDeadlineMs, mark);

  const facts =
    mode === 'speed'
      ? [
          { value: t`${speed}s`, label: t`Time per note` },
          { value: t`Miss`, label: t`On timeout` },
          { value: t`Fluent`, label: t`Earned here` },
        ]
      : [
          { value: '∞', label: t`Time per note` },
          { value: t`Recognized`, label: t`Highest band` },
        ];

  return (
    <section className="principle-panel">
      <span className="principle-line" />
      <p className="eyebrow">
        {mode === 'speed' ? t`Speed mode` : t`Practice mode`}
      </p>
      <h2>
        {mode === 'speed' ? t`No time to count.` : t`Don’t count. Recognize.`}
      </h2>
      <p>
        {mode === 'speed'
          ? t`Every note gets the same deadline, whatever you know of it, and letting it run out counts as a miss. Fluent is earned only here: twenty quick, accurate answers on a note, across at least two sessions.`
          : t`Fluent note reading is a visual-perceptual skill. Nothing here is on a clock, so you can look until a note’s whole pattern lands instead of counting lines up to it. Miss one and it comes back a few questions later. Notes reach Recognized this way; Fluent is Speed’s to give.`}
      </p>
      <div className="principle-stats">
        {facts.map((fact) => (
          <span key={fact.label}>
            <strong>{fact.value}</strong>
            <small>{fact.label}</small>
          </span>
        ))}
      </div>
    </section>
  );
}
