import { useCallback, useEffect, useRef, useState } from 'react';

import type { SessionSummary } from '../app-state/app-state';
import type { AttemptRecord, LessonAnswer } from '../app-state/use-app-state';
import type { RecognitionItem } from '../music/music';
import { windowForMidi, type KeyboardWindow } from '../piano/piano-layout';
import { CORRECTION_DELAY, CORRECT_DELAY } from '../practice/session';
import { useMidiInput, type MidiController } from '../practice/use-midi-input';
import { midiAnswer, type NormalizedAnswer } from '../training/input';
import {
  emptyNoteStats,
  median,
  recordOutcome,
  weakestNotes,
  type AnswerResult,
  type InputMode,
  type NoteStats,
} from '../training/training';

import type { LevelLesson } from './lesson-state';
import type { Level } from './levels';
import {
  CHECK_DEADLINE_MS,
  newRunId,
  planRun,
  type RunPlan,
  type RunStep,
} from './run-plan';

export type RunFeedback = {
  result: AnswerResult;
  item: RecognitionItem;
  elapsedMs: number | null;
  /** A hinted answer is never wrong, but it never counts either. */
  hinted: boolean;
};

export type RunState = {
  plan: RunPlan;
  level: Level;
  runId: string;
  startedAt: number;
  /** The remaining steps, current one first. A missed note is spliced back in behind. */
  queue: RunStep[];
  step: RunStep;
  stepStartedAt: number;
  keyboardWindow: KeyboardWindow;
  /** Asks answered so far and asks planned, for the run's progress pips. */
  answered: number;
  planned: number;
  /** How much of the hint ladder is showing for the current step. */
  hint: number;
  credited: string[];
  lapsed: string[];
};

export type RunSummary = {
  levelId: string;
  asked: number;
  correct: number;
  credited: string[];
  lapsed: string[];
  introduced: string[];
  levelComplete: boolean;
};

export type LearningRunController = {
  run: RunState | null;
  feedback: RunFeedback | null;
  summary: RunSummary | null;
  input: InputMode;
  midi: MidiController;
  setInput: (input: InputMode) => void;
  start: (
    level: Level,
    lesson: LevelLesson | undefined,
    retention: readonly RecognitionItem[],
  ) => void;
  answer: (answer: NormalizedAnswer) => void;
  /** Opens the next rung of the hint ladder; the answer that follows earns no credit. */
  showHint: () => void;
  quit: () => void;
  dismissSummary: () => void;
};

function plannedAsks(plan: RunPlan): number {
  return plan.steps.filter((step) => step.kind === 'ask').length;
}

/** A missed note comes back later in the same run, once. */
function requeue(queue: RunStep[], step: RunStep): RunStep[] {
  const at = Math.min(queue.length, 2);
  return [...queue.slice(0, at), step, ...queue.slice(at)];
}

/**
 * The Learning runtime. A run is a plan walked to its end: teach cards, graded asks, and
 * retention asks that only keep the run honest. Nothing here is on a session clock — the
 * only deadline is the one a single check question carries.
 */
export function useLearningRun({
  notes,
  onAttempt,
  onLessonAnswer,
  onRunStart,
  onRunComplete,
}: {
  notes: Readonly<Record<string, NoteStats>>;
  onAttempt: (record: AttemptRecord) => void;
  onLessonAnswer: (answer: LessonAnswer) => void;
  onRunStart: (levelId: string) => void;
  onRunComplete: (summary: SessionSummary) => void;
}): LearningRunController {
  const [run, setRun] = useState<RunState | null>(null);
  const [feedback, setFeedback] = useState<RunFeedback | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [input, setInput] = useState<InputMode>('piano');
  const midi = useMidiInput();
  const { connect: connectMidi, subscribe: subscribeMidi } = midi;
  const advanceRef = useRef<number | null>(null);
  const notesRef = useRef(notes);
  const outcomesRef = useRef<
    { itemId: string; result: AnswerResult; elapsedMs: number | null }[]
  >([]);
  const onRunCompleteRef = useRef(onRunComplete);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    onRunCompleteRef.current = onRunComplete;
  }, [onRunComplete]);

  const clearAdvance = useCallback(() => {
    if (advanceRef.current !== null) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }, []);

  const finish = useCallback(
    (state: RunState) => {
      clearAdvance();
      const outcomes = outcomesRef.current;
      const times = outcomes
        .filter((one) => one.result === 'correct' && one.elapsedMs !== null)
        .map((one) => one.elapsedMs as number);
      const ids = new Set(outcomes.map((one) => one.itemId));
      onRunCompleteRef.current({
        id: state.runId,
        startedAt: state.startedAt,
        durationSeconds: Math.round((Date.now() - state.startedAt) / 1000),
        mode: 'practice',
        track: 'learning',
        levelId: state.level.id,
        attempts: outcomes.length,
        correct: outcomes.filter((one) => one.result === 'correct').length,
        timeouts: outcomes.filter((one) => one.result === 'timeout').length,
        medianResponseMs: median(times),
        practiceSeconds: Math.round((Date.now() - state.startedAt) / 1000),
        newRecognized: [],
        newFluent: [],
        weakestItemIds: weakestNotes(
          [...ids]
            .map((id) => notesRef.current[id])
            .filter((note): note is NoteStats => Boolean(note)),
          3,
        ).map((note) => note.itemId),
      });
      setSummary({
        levelId: state.level.id,
        asked: outcomes.length,
        correct: outcomes.filter((one) => one.result === 'correct').length,
        credited: state.credited,
        lapsed: state.lapsed,
        introduced: state.plan.introducing,
        levelComplete: false,
      });
      setRun(null);
      setFeedback(null);
    },
    [clearAdvance],
  );

  const advanceTo = useCallback(
    (state: RunState, queue: RunStep[], extra: Partial<RunState> = {}) => {
      const [next, ...rest] = queue;
      if (!next) {
        finish({ ...state, ...extra });
        return;
      }
      setRun({
        ...state,
        ...extra,
        step: next,
        queue: rest,
        stepStartedAt: Date.now(),
        keyboardWindow: windowForMidi(next.item.pitch.midi),
        hint: 0,
      });
      setFeedback(null);
    },
    [finish],
  );

  const start = useCallback(
    (
      level: Level,
      lesson: LevelLesson | undefined,
      retention: readonly RecognitionItem[],
    ) => {
      const runId = newRunId();
      const plan = planRun({ level, lesson, retention, runId });
      const [first, ...rest] = plan.steps;
      if (!first) return;
      outcomesRef.current = [];
      onRunStart(level.id);
      setSummary(null);
      setFeedback(null);
      setRun({
        plan,
        level,
        runId,
        startedAt: Date.now(),
        queue: rest,
        step: first,
        stepStartedAt: Date.now(),
        keyboardWindow: windowForMidi(first.item.pitch.midi),
        answered: 0,
        planned: plannedAsks(plan),
        hint: 0,
        credited: [],
        lapsed: [],
      });
    },
    [onRunStart],
  );

  const judge = useCallback(
    (given: NormalizedAnswer | undefined, timeout = false) => {
      if (!run || feedback) return;
      const { step } = run;
      const correct = given
        ? input === 'names'
          ? given.midi % 12 === step.item.pitch.midi % 12
          : given.midi === step.item.pitch.midi
        : false;

      /* A teach card is exposure, not a question: the wrong key simply does nothing. */
      if (step.kind === 'teach') {
        if (correct) advanceTo(run, run.queue);
        return;
      }

      const at = Date.now();
      const elapsedMs = timeout ? null : Math.max(0, at - run.stepStartedAt);
      const result: AnswerResult = timeout
        ? 'timeout'
        : correct
          ? 'correct'
          : 'incorrect';
      const hinted = run.hint > 0;

      const previous =
        notesRef.current[step.item.id] ?? emptyNoteStats(step.item);
      onAttempt({
        itemId: step.item.id,
        stats: recordOutcome(previous, {
          result,
          elapsedMs,
          mode: 'practice',
          input,
          sessionId: run.runId,
          at,
        }),
        outcome: { result, elapsedMs, mode: 'practice', at },
      });
      outcomesRef.current = [
        ...outcomesRef.current,
        { itemId: step.item.id, result, elapsedMs },
      ];

      /* Retention asks keep the run interleaved; they never move a finished level. */
      const grades = step.scoring === 'credit' && !hinted;
      if (grades)
        onLessonAnswer({
          levelId: run.level.id,
          itemId: step.item.id,
          runId: run.runId,
          correct: result === 'correct',
          at,
        });

      setFeedback({ result, item: step.item, elapsedMs, hinted });
      const queue = result === 'correct' ? run.queue : requeue(run.queue, step);
      /* A note that broke and was then put right ends the run in one list, not both. */
      const moved = grades && result === 'correct';
      const broke = grades && result !== 'correct';
      const credited = moved
        ? [...new Set([...run.credited, step.item.id])]
        : run.credited.filter((id) => !broke || id !== step.item.id);
      const lapsed = broke
        ? [...new Set([...run.lapsed, step.item.id])]
        : run.lapsed.filter((id) => !moved || id !== step.item.id);

      advanceRef.current = window.setTimeout(
        () => {
          advanceRef.current = null;
          advanceTo(run, queue, {
            answered: run.answered + 1,
            credited,
            lapsed,
          });
        },
        result === 'correct' ? CORRECT_DELAY : CORRECTION_DELAY,
      );
    },
    [advanceTo, feedback, input, onAttempt, onLessonAnswer, run],
  );

  /** Only a check question is on a clock, and only for as long as that one question lasts. */
  useEffect(() => {
    if (!run || feedback) return;
    if (run.step.kind !== 'ask' || !run.step.timed) return;
    const remaining = Math.max(
      0,
      CHECK_DEADLINE_MS - (Date.now() - run.stepStartedAt),
    );
    const timer = window.setTimeout(() => judge(undefined, true), remaining);
    return () => window.clearTimeout(timer);
  }, [feedback, judge, run]);

  useEffect(() => {
    if (!run || input !== 'midi') return;
    return subscribeMidi((note) => judge(midiAnswer(note)));
  }, [input, judge, run, subscribeMidi]);

  useEffect(() => clearAdvance, [clearAdvance]);

  const showHint = useCallback(() => {
    setRun((current) =>
      current ? { ...current, hint: Math.min(2, current.hint + 1) } : current,
    );
  }, []);

  const quit = useCallback(() => {
    if (run) finish(run);
  }, [finish, run]);

  const chooseInput = useCallback(
    (next: InputMode) => {
      setInput(next);
      if (next === 'midi') connectMidi();
    },
    [connectMidi],
  );

  return {
    run,
    feedback,
    summary,
    input,
    midi,
    setInput: chooseInput,
    start,
    answer: useCallback((value: NormalizedAnswer) => judge(value), [judge]),
    showHint,
    quit,
    dismissSummary: useCallback(() => setSummary(null), []),
  };
}
