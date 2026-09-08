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
          { value: t`${speed}s`, label: t`Every note` },
          { value: t`Miss`, label: t`On timeout` },
        ]
      : [
          { value: '∞', label: t`Every note` },
          { value: t`None`, label: t`Timeouts` },
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
          ? t`Every note gets the same deadline, whatever you know of it, and letting it run out counts as a miss. Speed measures the recognition Practice builds.`
          : t`Fluent note reading is a visual-perceptual skill. Practice leaves room to see a note’s whole pattern instead of calculating its position: no note is ever on the clock, so nothing hurries you into counting. When you want the pressure, that is what Speed is for.`}
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
