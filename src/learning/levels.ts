import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import { CURRICULUM, type Clef, type RecognitionItem } from '../music/music';

/**
 * The learning path: the curriculum cut into sections, each a handful of levels that
 * teach notes in small blocks and then a mixed level that asks for all of them at once.
 *
 * Blocks first, mixing second, is deliberate. Interleaving is the stronger practice for
 * visual material, but novices need a block of undisturbed exposure before it pays; the
 * mixed capstone is where the block's local cues stop working and reading has to happen.
 */
export type LevelKind = 'block' | 'bridge' | 'mixed';

export type Level = {
  id: string;
  kind: LevelKind;
  clefs: Clef[];
  title: MessageDescriptor;
  /** What the level asks for, shown under its title. */
  goal: MessageDescriptor;
  /**
   * Correct retrievals a note needs, each one from a different run. Recalling an item
   * once in each of several spaced sessions retains far better than recalling it several
   * times in one, so the number is small and the runs are what carry the weight.
   */
  credits: number;
  /** Every note of the level, low to high — the order it is displayed in. */
  items: RecognitionItem[];
  /** The same notes in curriculum order, landmarks first — the order they are taught in. */
  teachOrder: RecognitionItem[];
};

export type Section = {
  id: string;
  title: MessageDescriptor;
  blurb: MessageDescriptor;
  levels: Level[];
};

/** A block level asks for three credits; a mixed one is harder per question, so it asks fewer. */
const BLOCK_CREDITS = 3;
const MIXED_CREDITS = 2;

type ItemFilter = (item: RecognitionItem) => boolean;

const isNatural: ItemFilter = (item) => item.pitch.accidental === 'natural';
const isSharp: ItemFilter = (item) => item.pitch.accidental === 'sharp';
const isFlat: ItemFilter = (item) => item.pitch.accidental === 'flat';
const all =
  (...filters: ItemFilter[]): ItemFilter =>
  (item) =>
    filters.every((match) => match(item));
const midiWithin =
  (from: number, to: number): ItemFilter =>
  (item) =>
    item.pitch.midi >= from && item.pitch.midi <= to;

/**
 * The span each staff can print without help: middle C up to the treble's top line, and
 * the bass staff's own five lines plus the middle C above them. Everything outside this
 * is read by counting ledger lines, which the path treats as its own skill.
 */
const ON_STAFF: Record<Clef, [number, number]> = {
  treble: [60, 77],
  bass: [43, 60],
};
const onStaff: ItemFilter = (item) =>
  item.pitch.midi >= ON_STAFF[item.clef][0] &&
  item.pitch.midi <= ON_STAFF[item.clef][1];
const beyondStaff: ItemFilter = (item) => !onStaff(item);

function collect(clefs: Clef[], matches: ItemFilter): RecognitionItem[] {
  return clefs.flatMap((clef) => CURRICULUM[clef].filter(matches));
}

type LevelSpec = Omit<Level, 'items' | 'teachOrder' | 'credits'> & {
  credits?: number;
  matches: ItemFilter;
};

/**
 * The curriculum arrays are ordered by teaching value, not by pitch — treble opens on G4,
 * the line the clef curls around. Introduction follows that order; display follows pitch.
 */
function level({ matches, credits, ...rest }: LevelSpec): Level {
  const teachOrder = collect(rest.clefs, matches);
  return {
    ...rest,
    credits: credits ?? (rest.kind === 'mixed' ? MIXED_CREDITS : BLOCK_CREDITS),
    teachOrder,
    items: [...teachOrder].sort(
      (left, right) => left.pitch.midi - right.pitch.midi,
    ),
  };
}

export const SECTIONS: readonly Section[] = [
  {
    id: 'treble',
    title: msg`The treble staff`,
    blurb: msg`Start where the treble clef points: the G line its curl wraps around.`,
    levels: [
      level({
        id: 'treble-middle',
        kind: 'block',
        clefs: ['treble'],
        title: msg`The middle octave`,
        goal: msg`The seven naturals from middle C up to B, anchored on G.`,
        matches: all(isNatural, midiWithin(60, 71)),
      }),
      level({
        id: 'treble-upper',
        kind: 'block',
        clefs: ['treble'],
        title: msg`Above the octave`,
        goal: msg`The naturals that carry on above B, anchored on the C in the third space.`,
        matches: all(isNatural, midiWithin(72, 77)),
      }),
      level({
        id: 'treble-staff',
        kind: 'mixed',
        clefs: ['treble'],
        title: msg`The whole treble staff`,
        goal: msg`Both octaves at once, on the clock. No block to lean on.`,
        matches: all(isNatural, onStaff),
      }),
    ],
  },
  {
    id: 'bass',
    title: msg`The bass staff`,
    blurb: msg`A different clef, a different anchor: the F line the clef's two dots straddle.`,
    levels: [
      level({
        id: 'bass-anchor',
        kind: 'block',
        clefs: ['bass'],
        title: msg`The F anchor`,
        goal: msg`The seven naturals from the bottom line up to the F the clef marks.`,
        matches: all(isNatural, midiWithin(43, 53)),
      }),
      level({
        id: 'bass-upper',
        kind: 'block',
        clefs: ['bass'],
        title: msg`Up to middle C`,
        goal: msg`From G to the middle C that sits above the bass staff.`,
        matches: all(isNatural, midiWithin(55, 60)),
      }),
      level({
        id: 'bass-staff',
        kind: 'mixed',
        clefs: ['bass'],
        title: msg`The whole bass staff`,
        goal: msg`Every natural of the bass staff, on the clock.`,
        matches: all(isNatural, onStaff),
      }),
    ],
  },
  {
    id: 'both',
    title: msg`Both staves`,
    blurb: msg`The same line means different notes in each clef. This is where that gets settled.`,
    levels: [
      level({
        id: 'middle-c',
        kind: 'bridge',
        clefs: ['treble', 'bass'],
        title: msg`Middle C, two ways`,
        goal: msg`One key, written below the treble staff and above the bass staff. The hinge between them.`,
        matches: (item) => item.pitch.midi === 60 && isNatural(item),
      }),
      level({
        id: 'both-staves',
        kind: 'mixed',
        clefs: ['treble', 'bass'],
        title: msg`Both staves, naturals`,
        goal: msg`Treble and bass shuffled together. The clef decides the answer.`,
        matches: all(isNatural, onStaff),
      }),
    ],
  },
  {
    id: 'beyond',
    title: msg`Beyond the staff`,
    blurb: msg`Five lines only reach so far. Past them a note gets short lines of its own, and reading it means counting outward from an edge instead of knowing a place between the lines.`,
    levels: [
      level({
        id: 'below-bass',
        kind: 'block',
        clefs: ['bass'],
        title: msg`Under the bass staff`,
        goal: msg`Down towards the left hand: the space below the staff, then out to the C on two short lines.`,
        matches: all(isNatural, beyondStaff, midiWithin(0, 42)),
      }),
      level({
        id: 'above-bass',
        kind: 'block',
        clefs: ['bass'],
        title: msg`Over the bass staff`,
        goal: msg`Up past middle C. The last of these is the treble staff's own G, written the long way round.`,
        matches: all(isNatural, beyondStaff, midiWithin(61, 127)),
      }),
      level({
        id: 'below-treble',
        kind: 'block',
        clefs: ['treble'],
        title: msg`Under the treble staff`,
        goal: msg`The notes between the two staves, read from above instead of below.`,
        matches: all(isNatural, beyondStaff, midiWithin(0, 59)),
      }),
      level({
        id: 'above-treble',
        kind: 'block',
        clefs: ['treble'],
        title: msg`Over the treble staff`,
        goal: msg`Up past the top line, out to the C that sits on two short lines of its own.`,
        matches: all(isNatural, beyondStaff, midiWithin(78, 127)),
      }),
      level({
        id: 'beyond-mixed',
        kind: 'mixed',
        clefs: ['treble', 'bass'],
        title: msg`Off the staff, both clefs`,
        goal: msg`Every note outside the lines, shuffled and on the clock.`,
        matches: all(isNatural, beyondStaff),
      }),
    ],
  },
  {
    id: 'accidentals',
    title: msg`Sharps and flats`,
    blurb: msg`The black keys, one clef and one sign at a time, then all of them together.`,
    levels: [
      level({
        id: 'treble-sharps',
        kind: 'block',
        clefs: ['treble'],
        title: msg`Treble sharps`,
        goal: msg`The sharpened notes of the treble staff, in circle-of-fifths order.`,
        matches: isSharp,
      }),
      level({
        id: 'treble-flats',
        kind: 'block',
        clefs: ['treble'],
        title: msg`Treble flats`,
        goal: msg`The same black keys read the other way, as flats.`,
        matches: isFlat,
      }),
      level({
        id: 'bass-sharps',
        kind: 'block',
        clefs: ['bass'],
        title: msg`Bass sharps`,
        goal: msg`The sharpened notes of the bass staff.`,
        matches: isSharp,
      }),
      level({
        id: 'bass-flats',
        kind: 'block',
        clefs: ['bass'],
        title: msg`Bass flats`,
        goal: msg`The bass staff's black keys read as flats.`,
        matches: isFlat,
      }),
      level({
        id: 'accidentals-mixed',
        kind: 'mixed',
        clefs: ['treble', 'bass'],
        title: msg`Every accidental`,
        goal: msg`Sharps and flats, both staves, on the clock.`,
        matches: (item) => isSharp(item) || isFlat(item),
      }),
    ],
  },
  {
    id: 'summit',
    title: msg`The whole staff`,
    blurb: msg`Everything the curriculum holds, shuffled, timed. One pass to prove it.`,
    levels: [
      level({
        id: 'whole-staff',
        kind: 'mixed',
        clefs: ['treble', 'bass'],
        title: msg`Everything`,
        goal: msg`All thirty-nine readings, in any order, with a clock running.`,
        credits: 1,
        matches: () => true,
      }),
    ],
  },
];

export const LEVELS: readonly Level[] = SECTIONS.flatMap(
  (section) => section.levels,
);

export function findLevel(levelId: string): Level | undefined {
  return LEVELS.find((entry) => entry.id === levelId);
}

export function sectionOf(levelId: string): Section | undefined {
  return SECTIONS.find((section) =>
    section.levels.some((entry) => entry.id === levelId),
  );
}

/** Mixed levels run every question on the clock; a block level only times the last credit. */
export function timesEveryQuestion(level: Level): boolean {
  return level.kind === 'mixed';
}
