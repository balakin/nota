import type { Clef, RecognitionItem } from '../music/music';
import { CURRICULUM } from '../music/music';

/** Inclusive MIDI bounds. The learner chooses the span; nothing is gated behind progress. */
export type PitchRange = { from: number; to: number };

export function curriculumFor(clefs: readonly Clef[]): RecognitionItem[] {
  return clefs
    .flatMap((clef) => CURRICULUM[clef])
    .slice()
    .sort((left, right) => left.pitch.midi - right.pitch.midi);
}

/** The notes actually available for a clef choice, ordered low to high. */
export function rangeBounds(clefs: readonly Clef[]): PitchRange {
  const items = curriculumFor(clefs);
  if (items.length === 0) return { from: 0, to: 0 };
  return {
    from: items[0].pitch.midi,
    to: items[items.length - 1].pitch.midi,
  };
}

export function selectedItems(
  clefs: readonly Clef[],
  range: PitchRange,
  accidentals = true,
): RecognitionItem[] {
  return curriculumFor(clefs).filter(
    (item) =>
      item.pitch.midi >= range.from &&
      item.pitch.midi <= range.to &&
      (accidentals || item.pitch.accidental === 'natural'),
  );
}

/** Keeps a chosen span inside what the current clefs offer, widening it if it fell outside. */
export function clampRange(
  range: PitchRange,
  clefs: readonly Clef[],
): PitchRange {
  const bounds = rangeBounds(clefs);
  const from = Math.min(Math.max(range.from, bounds.from), bounds.to);
  const to = Math.max(Math.min(range.to, bounds.to), bounds.from);
  return from <= to ? { from, to } : bounds;
}

/** Whether the chosen clefs, range and accidentals are exactly what a preset stands for. */
export function matchesPreset(
  preset: {
    clefs: readonly Clef[];
    range: PitchRange;
    accidentals: boolean;
  },
  clefs: readonly Clef[],
  range: PitchRange,
  accidentals: boolean,
): boolean {
  return (
    preset.accidentals === accidentals &&
    preset.range.from === range.from &&
    preset.range.to === range.to &&
    preset.clefs.length === clefs.length &&
    preset.clefs.every((clef) => clefs.includes(clef))
  );
}

/** Distinct pitches in the span, so the picker lists a key once whatever its spellings. */
export function rangePitches(clefs: readonly Clef[]): number[] {
  return [...new Set(curriculumFor(clefs).map((item) => item.pitch.midi))].sort(
    (left, right) => left - right,
  );
}
