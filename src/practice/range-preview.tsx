import { useMemo } from 'react';

import type { Locale } from '../app-state/app-state';
import type { Clef } from '../music/music';
import { RangeStaff } from '../notation/range-staff';
import { selectedItems, type PitchRange } from '../training/selection';

/**
 * The edges of the chosen range on the staff, one stave per clef in play. A clef the range does
 * not reach is left out rather than drawn empty.
 */
export function RangePreview({
  clefs,
  range,
  locale,
}: {
  clefs: readonly Clef[];
  range: PitchRange;
  locale: Locale;
}) {
  const edges = useMemo(() => {
    const items = selectedItems(clefs, range);
    return (['treble', 'bass'] as const)
      .filter((clef) => clefs.includes(clef))
      .map((clef) => {
        const own = items.filter((item) => item.clef === clef);
        const low = own[0]?.pitch;
        const high = own[own.length - 1]?.pitch;
        return {
          clef,
          pitches: !low || !high ? [] : low === high ? [low] : [low, high],
        };
      })
      .filter(({ pitches }) => pitches.length > 0);
  }, [clefs, range]);

  return (
    <div className="range-preview">
      {edges.map(({ clef, pitches }) => (
        <RangeStaff key={clef} clef={clef} pitches={pitches} locale={locale} />
      ))}
    </div>
  );
}
