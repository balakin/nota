import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import { pitch, type Clef } from '../music/music';

import { rangeBounds, type PitchRange } from './selection';

/** What applying a preset sets, whether it ships with the app or was saved by the learner. */
export type PresetValues = {
  clefs: readonly Clef[];
  range: PitchRange;
  accidentals: boolean;
};

/** A setup the learner saved under their own name. */
export type CustomPreset = PresetValues & {
  id: string;
  name: string;
  clefs: Clef[];
};

export const MAX_CUSTOM_PRESETS = 12;
export const MAX_PRESET_NAME_LENGTH = 32;

/** A ready-made choice of clefs, range and accidentals, for someone who does not know where to start. */
export type PresetGroup = 'treble' | 'bass' | 'both';

export type RangePreset = {
  id: string;
  /** The row it is listed under, which also says which clefs it uses. */
  group: PresetGroup;
  /** Short, because the group already names the clef. */
  title: MessageDescriptor;
  clefs: readonly Clef[];
  range: PitchRange;
  accidentals: boolean;
};

const span = (
  from: Parameters<typeof pitch>,
  to: Parameters<typeof pitch>,
): PitchRange => ({ from: pitch(...from).midi, to: pitch(...to).midi });

/**
 * Ordered as a way to learn, easiest first. Treble comes before bass because it is what most
 * people meet first. Each clef starts with the octave nearest middle C as naturals only, then
 * adds its sharps and flats straight away — a black key is one more thing to read, not something
 * to hold back until every natural is secure — and only then grows outward. Following the list
 * top to bottom is the path; any entry is also a fine place to start.
 */
export const RANGE_PRESETS: readonly RangePreset[] = [
  {
    id: 'treble-first',
    group: 'treble',
    title: msg`First octave`,
    clefs: ['treble'],
    range: span(['C', 4], ['B', 4]),
    accidentals: false,
  },
  {
    id: 'treble-first-accidentals',
    group: 'treble',
    title: msg`First octave + ♯♭`,
    clefs: ['treble'],
    range: span(['C', 4], ['B', 4]),
    accidentals: true,
  },
  {
    id: 'treble-second',
    group: 'treble',
    title: msg`Second octave`,
    clefs: ['treble'],
    range: span(['C', 5], ['B', 5]),
    accidentals: false,
  },
  {
    id: 'treble-both',
    group: 'treble',
    title: msg`Both octaves + ♯♭`,
    clefs: ['treble'],
    range: span(['C', 4], ['B', 5]),
    accidentals: true,
  },
  {
    id: 'bass-first',
    group: 'bass',
    title: msg`First octave`,
    clefs: ['bass'],
    range: span(['C', 3], ['B', 3]),
    accidentals: false,
  },
  {
    id: 'bass-first-accidentals',
    group: 'bass',
    title: msg`First octave + ♯♭`,
    clefs: ['bass'],
    range: span(['C', 3], ['B', 3]),
    accidentals: true,
  },
  {
    id: 'bass-second',
    group: 'bass',
    title: msg`Second octave`,
    clefs: ['bass'],
    range: span(['C', 2], ['B', 2]),
    accidentals: false,
  },
  {
    id: 'bass-both',
    group: 'bass',
    title: msg`Both octaves + ♯♭`,
    clefs: ['bass'],
    range: span(['C', 2], ['B', 3]),
    accidentals: true,
  },
  {
    id: 'both-naturals',
    group: 'both',
    title: msg`Naturals`,
    clefs: ['treble', 'bass'],
    range: span(['C', 2], ['B', 5]),
    accidentals: false,
  },
  {
    id: 'everything',
    group: 'both',
    title: msg`All notes`,
    clefs: ['treble', 'bass'],
    range: span(['A', 1], ['E', 6]),
    accidentals: true,
  },
];

/**
 * Saved presets come back from storage, so nothing about them is trusted: a preset that does not
 * read as a name, at least one known clef, and a range inside what those clefs offer is dropped
 * rather than repaired.
 */
export function readCustomPresets(value: unknown): CustomPreset[] {
  if (!Array.isArray(value)) return [];
  const presets: CustomPreset[] = [];
  for (const stored of value as Partial<CustomPreset>[]) {
    if (!stored || typeof stored !== 'object') continue;
    const clefs = (['treble', 'bass'] as const).filter(
      (clef) => Array.isArray(stored.clefs) && stored.clefs.includes(clef),
    );
    const range = stored.range;
    const name =
      typeof stored.name === 'string'
        ? stored.name.trim().slice(0, MAX_PRESET_NAME_LENGTH)
        : '';
    if (
      typeof stored.id !== 'string' ||
      !name ||
      clefs.length === 0 ||
      !range ||
      !Number.isFinite(range.from) ||
      !Number.isFinite(range.to) ||
      range.from > range.to
    )
      continue;
    const bounds = rangeBounds(clefs);
    if (range.from < bounds.from || range.to > bounds.to) continue;
    presets.push({
      id: stored.id,
      name,
      clefs,
      range: { from: range.from, to: range.to },
      accidentals: stored.accidentals !== false,
    });
  }
  return presets.slice(0, MAX_CUSTOM_PRESETS);
}
