import { useMemo } from 'react';

import type { Locale } from '../app-state/app-state';
import type { Clef } from '../music/music';
import { RangeStaff } from '../notation/range-staff';
import { selectedItems, type PitchRange } from '../training/selection';

/**
 * Every note of the chosen range on the staff, one stave per clef in play. A clef the range does
 * not reach is left out rather than drawn empty.
 */
export function RangePreview({
  clefs,
  range,
  accidentals,
  locale,
}: {
  clefs: readonly Clef[];
  range: PitchRange;
  accidentals: boolean;
  locale: Locale;
}) {
  const edges = useMemo(() => {
    const items = selectedItems(clefs, range, accidentals);
    return (['treble', 'bass'] as const)
      .filter((clef) => clefs.includes(clef))
      .map((clef) => {
        const own = items.filter((item) => item.clef === clef);
        return { clef, pitches: own.map((item) => item.pitch) };
      })
      .filter(({ pitches }) => pitches.length > 0);
  }, [accidentals, clefs, range]);

  return (
    <div className="range-preview">
      {edges.map(({ clef, pitches }) => (
        <RangeStaff key={clef} clef={clef} pitches={pitches} locale={locale} />
      ))}
    </div>
  );
}
