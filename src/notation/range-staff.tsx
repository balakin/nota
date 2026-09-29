import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';

import type { Locale } from '../app-state/app-state';
import {
  accessiblePitchLabel,
  type CanonicalPitch,
  type Clef,
} from '../music/music';

import { useContainerWidth } from './use-container-width';

/** One clef's notes of the chosen range, low to high, drawn on as many staves as they need. */
export function RangeStaff({
  clef,
  pitches,
  locale,
}: {
  clef: Clef;
  pitches: readonly CanonicalPitch[];
  locale: Locale;
}) {
  const { ref, width } = useContainerWidth();
  const { t } = useLingui();

  useEffect(() => {
    let cancelled = false;
    void import('./vexflow-renderer').then(
      async ({ renderRange, notationFontReady }) => {
        await notationFontReady;
        if (!ref.current || cancelled) return;
        try {
          renderRange(ref.current, clef, pitches);
        } catch {
          ref.current.replaceChildren();
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [ref, clef, pitches, width]);

  const low = accessiblePitchLabel(pitches[0], 'solfege', locale);
  const high = accessiblePitchLabel(
    pitches[pitches.length - 1],
    'solfege',
    locale,
  );
  const count = pitches.length;
  return (
    <div
      ref={ref}
      className="range-staff"
      role="img"
      aria-label={t`Range on the ${clef === 'treble' ? t`Treble` : t`Bass`} staff: ${low} to ${high}, ${count} notes`}
    />
  );
}
