import { describe, expect, it } from 'vitest';

import { findRecognitionItem } from '../../music/recognition-items';
import {
  emptyLevelLesson,
  emptyNoteLesson,
  type LevelLesson,
} from '../lesson-state';
import { findLevel } from '../levels';
import {
  askIsTimed,
  isConfusable,
  MAX_INTRODUCED,
  planRun,
  REPAIR_BLOCKS_INTRODUCTION,
  retentionPool,
  runOutline,
  TARGET_ASKS,
} from '../run-plan';

const level = findLevel('treble-middle')!;
const mixed = findLevel('treble-staff')!;
const steady = () => 0.99;

function lesson(
  notes: Record<string, Partial<ReturnType<typeof emptyNoteLesson>>>,
): LevelLesson {
  return {
    ...emptyLevelLesson(),
    notes: Object.fromEntries(
      Object.entries(notes).map(([id, note]) => [
        id,
        { ...emptyNoteLesson(), introduced: true, ...note },
      ]),
    ),
  };
}

const asks = (plan: ReturnType<typeof planRun>) =>
  plan.steps.filter((step) => step.kind === 'ask');

describe('planning a run', () => {
  it('meets at most two new notes, each taught then asked straight away', () => {
    const plan = planRun({
      level,
      lesson: undefined,
      runId: 'r1',
      random: steady,
    });
    expect(plan.introducing).toHaveLength(MAX_INTRODUCED);
    expect(plan.steps[0]).toMatchObject({ kind: 'teach' });
    expect(plan.steps[1]).toMatchObject({
      kind: 'ask',
      item: { id: plan.steps[0].item.id },
    });
    /* Landmarks are taught first: treble opens on the line its clef wraps. */
    expect(plan.introducing[0]).toBe('treble:G4');
  });

  it('teaches nothing new while the backlog is deep', () => {
    const broken = Object.fromEntries(
      level.items
        .slice(0, REPAIR_BLOCKS_INTRODUCTION)
        .map((item) => [item.id, { credits: 1, lapses: 1 }]),
    );
    const plan = planRun({
      level,
      lesson: lesson(broken),
      runId: 'r2',
      random: steady,
    });
    expect(plan.introducing).toHaveLength(0);
    expect(plan.repairing).toHaveLength(REPAIR_BLOCKS_INTRODUCTION);
    expect(runOutline(level, lesson(broken)).introduce).toBe(0);
  });

  it('leaves out notes that are already learned', () => {
    const done = Object.fromEntries(
      level.items.map((item) => [item.id, { credits: level.credits }]),
    );
    const plan = planRun({
      level,
      lesson: lesson(done),
      runId: 'r3',
      random: steady,
    });
    expect(asks(plan)).toHaveLength(0);
    expect(runOutline(level, lesson(done)).complete).toBe(true);
  });

  it('times the last credit of a block level, and every question of a mixed one', () => {
    expect(askIsTimed(level, { ...emptyNoteLesson(), credits: 0 })).toBe(false);
    expect(askIsTimed(level, { ...emptyNoteLesson(), credits: 2 })).toBe(true);
    expect(askIsTimed(mixed, { ...emptyNoteLesson(), credits: 0 })).toBe(true);
  });

  it('brings finished notes back so a run is never pure blocked practice', () => {
    const done = findLevel('treble-upper')!;
    const pool = retentionPool([done], level);
    const plan = planRun({
      level,
      lesson: undefined,
      retention: pool,
      runId: 'r4',
      random: steady,
    });
    expect(plan.retaining.length).toBeGreaterThan(0);
    for (const id of plan.retaining)
      expect(level.items.some((item) => item.id === id)).toBe(false);
    const retained = asks(plan).filter((step) => step.scoring === 'retain');
    expect(retained.length).toBe(plan.retaining.length);
  });

  it("keeps a level's own notes out of its retention pool", () => {
    expect(retentionPool([level], level)).toHaveLength(0);
  });

  it('knows which notes could be mistaken for each other', () => {
    const c4 = findRecognitionItem('treble:C4')!;
    const c5 = findRecognitionItem('treble:C5')!;
    const trebleA4 = findRecognitionItem('treble:A4')!;
    const bassC3 = findRecognitionItem('bass:C3')!;
    /* Same letter, an octave apart. */
    expect(isConfusable(c4, c5)).toBe(true);
    /* The same place on the staff: second space up is A in treble, C in bass. */
    expect(isConfusable(trebleA4, bassC3)).toBe(true);
    expect(isConfusable(c4, c4)).toBe(false);
    expect(isConfusable(c4, trebleA4)).toBe(false);
  });

  it('counts the next run before building it', () => {
    const mid = lesson({
      'treble:G4': { credits: 2 },
      'treble:E4': { credits: 1, lapses: 1 },
    });
    expect(runOutline(level, mid)).toMatchObject({
      introduce: 2,
      repair: 1,
      consolidate: 1,
      complete: false,
    });
    /* G4 is one credit short of the three, so its next ask runs on the clock. */
    expect(runOutline(level, mid).timed).toBe(1);
  });
});

describe('run size', () => {
  it('fills a thin run with ungraded repeats, and still credits each note once', () => {
    const plan = planRun({
      level,
      lesson: undefined,
      runId: 'r5',
      random: steady,
    });
    const graded = asks(plan).filter((step) => step.scoring === 'credit');
    expect(graded).toHaveLength(MAX_INTRODUCED);
    for (const item of plan.introducing)
      expect(graded.filter((step) => step.item.id === item)).toHaveLength(1);
    expect(asks(plan).length).toBeGreaterThanOrEqual(TARGET_ASKS - 1);
    expect(asks(plan).some((step) => step.scoring === 'practice')).toBe(true);
  });

  it('never asks the same note twice running', () => {
    const plan = planRun({
      level,
      lesson: undefined,
      runId: 'r6',
      random: () => 0.4,
    });
    const ids = plan.steps
      .filter((step) => step.kind === 'ask')
      .map((step) => step.item.id);
    for (let index = 1; index < ids.length; index += 1)
      expect(ids[index]).not.toBe(ids[index - 1]);
  });

  it('runs an ungraded repeat on the clock only where every question is timed', () => {
    const plan = planRun({
      level,
      lesson: undefined,
      runId: 'r7',
      random: steady,
    });
    expect(
      asks(plan)
        .filter((step) => step.scoring === 'practice')
        .every((step) => !step.timed),
    ).toBe(true);
    const mixedPlan = planRun({
      level: mixed,
      lesson: undefined,
      runId: 'r8',
      random: steady,
    });
    expect(asks(mixedPlan).every((step) => step.timed)).toBe(true);
  });
});

describe('a mixed level', () => {
  it('teaches nothing, because its notes were all met in the blocks behind it', () => {
    const plan = planRun({
      level: mixed,
      lesson: undefined,
      runId: 'r9',
      random: steady,
    });
    expect(plan.steps.filter((step) => step.kind === 'teach')).toHaveLength(0);
    expect(plan.introducing).toHaveLength(0);
    expect(runOutline(mixed, undefined).introduce).toBe(0);
    expect(runOutline(mixed, undefined).consolidate).toBe(mixed.items.length);
  });
});
