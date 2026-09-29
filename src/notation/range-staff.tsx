import { useLingui } from '@lingui/react/macro';
import { useEffect } from 'react';

import type { Locale } from '../app-state/app-state';
import {
  accessiblePitchLabel,
  type CanonicalPitch,
  type Clef,
} from '../music/music';

import { useContainerWidth } from './use-container-width';

/** One clef's stave with the lowest and highest note of the chosen range drawn on it. */
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

  const notes = pitches
    .map((value) => accessiblePitchLabel(value, 'solfege', locale))
    .join(', ');
  return (
    <div
      ref={ref}
      className="range-staff"
      role="img"
      aria-label={t`Range on the ${clef === 'treble' ? t`Treble` : t`Bass`} staff: ${notes}`}
    />
  );
}
