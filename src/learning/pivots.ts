import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import {
  diatonicIndex,
  ledgerLineCount,
  staffPosition,
  type RecognitionItem,
} from '../music/music';

import { LEVELS } from './levels';

/**
 * Landmarks. A few notes are worth knowing outright — the clefs name two of them
 * themselves — and everything else is read against the nearest one. The curriculum
 * arrays already open on these; this is where the idea gets a name.
 */
export const PIVOT_IDS: readonly string[] = [
  'treble:G4',
  'treble:C5',
  'treble:C4',
  'bass:F3',
  'bass:C3',
  'bass:C4',
];

/** Why each landmark is findable without counting anything. */
export const PIVOT_REASONS: Record<string, MessageDescriptor> = {
  'treble:G4': msg`the line the treble clef curls around`,
  'treble:C5': msg`the third space up`,
  'treble:C4': msg`one short line below the staff`,
  'bass:F3': msg`the line the bass clef's two dots straddle`,
  'bass:C3': msg`the second space up`,
  'bass:C4': msg`one short line above the staff`,
};

const PIVOTS: RecognitionItem[] = LEVELS.flatMap((level) => level.items).filter(
  (item, index, items) =>
    PIVOT_IDS.includes(item.id) &&
    items.findIndex((other) => other.id === item.id) === index,
);

export function isPivot(item: RecognitionItem): boolean {
  return PIVOT_IDS.includes(item.id);
}

export type NoteBearing = {
  /** The landmark this note is read against; null only when the note has no clef-mate. */
  pivot: RecognitionItem | null;
  /** Diatonic steps from the pivot — positive upward, zero when the note is the pivot. */
  steps: number;
  /** A note sits either on a line or in a space; the parity of its staff position says which. */
  onLine: boolean;
  ledger: number;
};

/** Where a note stands relative to the nearest landmark of its own clef. */
export function bearingOf(item: RecognitionItem): NoteBearing {
  const candidates = PIVOTS.filter((pivot) => pivot.clef === item.clef);
  const pivot = candidates.reduce<RecognitionItem | null>((best, candidate) => {
    if (!best) return candidate;
    const distance = Math.abs(
      diatonicIndex(candidate.pitch) - diatonicIndex(item.pitch),
    );
    const bestDistance = Math.abs(
      diatonicIndex(best.pitch) - diatonicIndex(item.pitch),
    );
    return distance < bestDistance ? candidate : best;
  }, null);
  return {
    pivot,
    steps: pivot ? diatonicIndex(item.pitch) - diatonicIndex(pivot.pitch) : 0,
    onLine: staffPosition(item.pitch, item.clef) % 2 === 0,
    ledger: ledgerLineCount(item.pitch, item.clef),
  };
}
