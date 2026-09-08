import { staffPosition, type RecognitionItem } from '../music/music';

import {
  isPassed,
  noteLessonOf,
  phaseOf,
  type LevelLesson,
  type NoteLesson,
} from './lesson-state';
import { timesEveryQuestion, type Level } from './levels';

/**
 * A run is one press of Start: a short, self-contained pass over whatever the level
 * currently needs. It ends when its questions are answered, not when a clock runs out,
 * and it can credit each note at most once — so finishing a level takes several runs by
 * construction rather than by rationing.
 */
export type RunStep =
  | { kind: 'teach'; item: RecognitionItem }
  | {
      kind: 'ask';
      item: RecognitionItem;
      timed: boolean;
      /**
       * `credit` moves the level forward — one per note per run. `practice` is a further
       * rep of the same note inside the run: useful for getting it answerable at all,
       * but it earns nothing, because reps inside one sitting buy far less than the
       * next run does. `retain` is a finished note along for the interleaving.
       */
      scoring: 'credit' | 'practice' | 'retain';
    };

export type RunPlan = {
  runId: string;
  levelId: string;
  steps: RunStep[];
  introducing: string[];
  repairing: string[];
  consolidating: string[];
  retaining: string[];
};

/** What the next press of Start would hold. Countable without deciding an order. */
export type RunOutline = {
  introduce: number;
  repair: number;
  consolidate: number;
  /** Asks that will run on the clock. */
  timed: number;
  complete: boolean;
};

/** At most two notes meet the learner in any one run. */
export const MAX_INTRODUCED = 2;
/** Enough notes in trouble and the run teaches nothing new — it clears the backlog first. */
export const REPAIR_BLOCKS_INTRODUCTION = 3;
export const MAX_CREDIT_ASKS = 12;
export const MAX_RETAIN_ASKS = 2;
/**
 * A run only ever credits a note once, so with two new notes it would otherwise be over
 * in twenty seconds. Ungraded repeats bring it up to a useful size without pretending
 * that the extra reps are what makes the note stick.
 */
export const TARGET_ASKS = 9;
/** Learning's own deadline, gentler than Speed's, and not the learner's to set. */
export const CHECK_DEADLINE_MS = 3000;

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

/**
 * Two notes worth meeting back to back: the same letter an octave apart, or the same
 * place on the staff read in two clefs. Those are the confusions that survive blocked
 * practice, and they only surface when the pair is forced into contact.
 */
export function isConfusable(
  left: RecognitionItem,
  right: RecognitionItem,
): boolean {
  if (left.id === right.id) return false;
  if (
    left.pitch.name === right.pitch.name &&
    left.pitch.midi !== right.pitch.midi
  )
    return true;
  return (
    left.clef !== right.clef &&
    staffPosition(left.pitch, left.clef) ===
      staffPosition(right.pitch, right.clef)
  );
}

/**
 * Orders the asks, following a note with something it could be mistaken for when one is
 * left. Those confusions — the same letter an octave apart, the same line in two clefs —
 * survive blocked practice precisely because the pair never meets.
 */
function interleave<T extends { item: RecognitionItem }>(
  entries: readonly T[],
  random: () => number,
): T[] {
  const remaining = shuffled(entries, random);
  const ordered: T[] = [];
  while (remaining.length > 0) {
    const previous = ordered[ordered.length - 1]?.item;
    const contrast =
      previous && random() < 0.5
        ? remaining.findIndex((entry) => isConfusable(previous, entry.item))
        : -1;
    const spaced =
      previous && remaining.length > 1
        ? remaining.findIndex((entry) => entry.item.id !== previous.id)
        : 0;
    const index = contrast >= 0 ? contrast : Math.max(0, spaced);
    ordered.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return ordered;
}

/**
 * A block level only puts the last credit on the clock: the earlier ones are for learning
 * the note, the last one asks whether it comes without counting. A mixed level times
 * everything, which is the whole reason it exists.
 */
export function askIsTimed(level: Level, note: NoteLesson): boolean {
  return timesEveryQuestion(level) || note.credits >= level.credits - 1;
}

type Partitioned = {
  repair: RecognitionItem[];
  consolidate: RecognitionItem[];
  unseen: RecognitionItem[];
};

/**
 * A mixed level teaches nothing: every note in it was met in the block levels behind it,
 * and its own credits are a separate question — whether the note survives the mixture.
 */
function partition(level: Level, lesson: LevelLesson | undefined): Partitioned {
  const repair: RecognitionItem[] = [];
  const consolidate: RecognitionItem[] = [];
  const unseen: RecognitionItem[] = [];
  for (const item of level.teachOrder) {
    const note = noteLessonOf(lesson, item.id);
    if (isPassed(note, level)) continue;
    const phase = phaseOf(note, level);
    if (phase === 'repair') repair.push(item);
    else if (phase === 'learning' || level.kind === 'mixed')
      consolidate.push(item);
    else unseen.push(item);
  }
  return { repair, consolidate, unseen };
}

export function runOutline(
  level: Level,
  lesson: LevelLesson | undefined,
): RunOutline {
  const { repair, consolidate, unseen } = partition(level, lesson);
  const introduce =
    repair.length >= REPAIR_BLOCKS_INTRODUCTION
      ? 0
      : Math.min(MAX_INTRODUCED, unseen.length);
  const asked = [...repair, ...consolidate].slice(
    0,
    Math.max(0, MAX_CREDIT_ASKS - introduce),
  );
  const timed = asked.filter((item) =>
    askIsTimed(level, noteLessonOf(lesson, item.id)),
  ).length;
  return {
    introduce,
    repair: repair.length,
    consolidate: consolidate.length,
    timed: timed + (timesEveryQuestion(level) ? introduce : 0),
    complete: repair.length + consolidate.length + unseen.length === 0,
  };
}

/**
 * Builds the run. Notes in trouble come first and always fit; new notes are only met when
 * the backlog is small, because meeting a third note while three others are broken is how
 * a level stops being learnable.
 */
export function planRun({
  level,
  lesson,
  retention = [],
  runId,
  random = Math.random,
}: {
  level: Level;
  lesson: LevelLesson | undefined;
  /** Notes from levels already finished, brought back to keep this run from being blocked practice. */
  retention?: readonly RecognitionItem[];
  runId: string;
  random?: () => number;
}): RunPlan {
  const { repair, consolidate, unseen } = partition(level, lesson);
  const introduceCount =
    repair.length >= REPAIR_BLOCKS_INTRODUCTION
      ? 0
      : Math.min(MAX_INTRODUCED, unseen.length);
  const introducing = unseen.slice(0, introduceCount);
  const credited = [...repair, ...consolidate].slice(
    0,
    Math.max(0, MAX_CREDIT_ASKS - introducing.length),
  );
  const retaining = shuffled(retention, random).slice(
    0,
    credited.length + introducing.length > 0 ? MAX_RETAIN_ASKS : 0,
  );

  const steps: RunStep[] = [];
  /* A new note is shown, then asked straight away: the first retrieval is what fixes it. */
  for (const item of introducing) {
    steps.push({ kind: 'teach', item });
    steps.push({ kind: 'ask', item, timed: false, scoring: 'credit' });
  }

  type Entry = {
    item: RecognitionItem;
    scoring: 'credit' | 'practice' | 'retain';
  };
  const entries: Entry[] = [
    ...credited.map((item): Entry => ({ item, scoring: 'credit' })),
    ...retaining.map((item): Entry => ({ item, scoring: 'retain' })),
  ];
  /* Fill the run out with ungraded repeats, newest notes first: they need them most. */
  const repeatable = [...introducing, ...credited];
  for (
    let index = 0;
    repeatable.length > 0 && entries.length + introducing.length < TARGET_ASKS;
    index += 1
  )
    entries.push({
      item: repeatable[index % repeatable.length],
      scoring: 'practice',
    });

  for (const entry of interleave(entries, random)) {
    const graded = entry.scoring === 'credit';
    steps.push({
      kind: 'ask',
      item: entry.item,
      timed: graded
        ? askIsTimed(level, noteLessonOf(lesson, entry.item.id))
        : timesEveryQuestion(level),
      scoring: entry.scoring,
    });
  }

  return {
    runId,
    levelId: level.id,
    steps,
    introducing: introducing.map((item) => item.id),
    repairing: repair.map((item) => item.id),
    consolidating: consolidate.map((item) => item.id),
    retaining: retaining.map((item) => item.id),
  };
}

export function newRunId(now = Date.now(), random = Math.random): string {
  return `run-${String(now)}-${random().toString(36).slice(2, 8)}`;
}

/**
 * Notes from levels already finished, so a run is never pure blocked practice. They are
 * asked but not graded: a level that is done stays done, and their job here is to keep
 * the questions from being answerable by elimination.
 */
export function retentionPool(
  completed: readonly Level[],
  current: Level,
): RecognitionItem[] {
  const inLevel = new Set(current.items.map((item) => item.id));
  return completed
    .filter((level) => level.id !== current.id)
    .flatMap((level) => level.items)
    .filter((item) => !inLevel.has(item.id));
}
