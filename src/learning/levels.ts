import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import { CURRICULUM, type Clef, type RecognitionItem } from '../music/music';

/**
 * The learning path: the curriculum cut into ordered levels, each one a clef and a
 * span the learner can hold in their head at once. Naturals climb clef by clef, then
 * the accidentals follow. A level is opened only once the one before it is finished,
 * so the ladder is the curriculum's difficulty order made visible.
 */
export type Level = {
  id: string;
  clef: Clef;
  title: MessageDescriptor;
  /** What the level asks for, shown under its title. */
  goal: MessageDescriptor;
  /** The level's notes, low to high. Every curriculum item belongs to exactly one level. */
  items: RecognitionItem[];
};

type ItemFilter = (item: RecognitionItem) => boolean;

function pick(clef: Clef, matches: ItemFilter): RecognitionItem[] {
  return CURRICULUM[clef]
    .filter(matches)
    .slice()
    .sort((left, right) => left.pitch.midi - right.pitch.midi);
}

const isNatural: ItemFilter = (item) => item.pitch.accidental === 'natural';
const isSharp: ItemFilter = (item) => item.pitch.accidental === 'sharp';
const isFlat: ItemFilter = (item) => item.pitch.accidental === 'flat';
const inOctave =
  (...octaves: number[]): ItemFilter =>
  (item) =>
    octaves.includes(item.pitch.octave);

const both =
  (left: ItemFilter, right: ItemFilter): ItemFilter =>
  (item) =>
    left(item) && right(item);

export const LEVELS: readonly Level[] = [
  {
    id: 'treble-octave-4',
    clef: 'treble',
    title: msg`Treble · the middle octave`,
    goal: msg`The seven naturals from middle C up to B, read on the treble staff.`,
    items: pick('treble', both(isNatural, inOctave(4))),
  },
  {
    id: 'treble-octave-5',
    clef: 'treble',
    title: msg`Treble · above the octave`,
    goal: msg`The naturals that carry on above B4, up to the top line of the staff.`,
    items: pick('treble', both(isNatural, inOctave(5))),
  },
  {
    id: 'bass-naturals',
    clef: 'bass',
    title: msg`Bass · the octave below`,
    goal: msg`Every natural of the bass staff, from C3 up to middle C.`,
    items: pick('bass', both(isNatural, inOctave(3, 4))),
  },
  {
    id: 'treble-sharps',
    clef: 'treble',
    title: msg`Treble · sharps`,
    goal: msg`The sharpened notes of the treble staff, in circle-of-fifths order.`,
    items: pick('treble', isSharp),
  },
  {
    id: 'treble-flats',
    clef: 'treble',
    title: msg`Treble · flats`,
    goal: msg`The same black keys read the other way, as flats.`,
    items: pick('treble', isFlat),
  },
  {
    id: 'bass-sharps',
    clef: 'bass',
    title: msg`Bass · sharps`,
    goal: msg`The sharpened notes of the bass staff.`,
    items: pick('bass', isSharp),
  },
  {
    id: 'bass-flats',
    clef: 'bass',
    title: msg`Bass · flats`,
    goal: msg`The bass staff's black keys read as flats.`,
    items: pick('bass', isFlat),
  },
];

export function findLevel(levelId: string): Level | undefined {
  return LEVELS.find((level) => level.id === levelId);
}
