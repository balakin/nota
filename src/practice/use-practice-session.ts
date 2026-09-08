import { useCallback, useEffect, useRef, useState } from 'react';

import type { SessionSummary } from '../app-state/app-state';
import type { RolledAttempt } from '../app-state/use-app-state';
import type { Clef } from '../music/music';
import { windowForMidi } from '../piano/piano-layout';
import { midiAnswer, type NormalizedAnswer } from '../training/input';
import {
  clampRange,
  rangeBounds,
  selectedItems,
  type PitchRange,
} from '../training/selection';
import {
  clampSpeedDeadlineMs,
  deadlineRemainingMs,
  emptyNoteStats,
  median,
  recordOutcome,
  requeueAfterWrong,
  sessionDeadlineMs,
  weakestNotes,
  type AnswerResult,
  type InputMode,
  type NoteStats,
  type PracticeMode,
} from '../training/training';

import { pickNext } from './pick-next';
import {
  CORRECTION_DELAY,
  CORRECT_DELAY,
  type Feedback,
  type RuntimeOutcome,
  type RuntimeSession,
  type SessionDuration,
} from './session';
import { useMidiInput, type MidiController } from './use-midi-input';

export type PracticeSessionController = {
  session: RuntimeSession | null;
  feedback: Feedback | null;
  result: SessionSummary | null;
  mode: PracticeMode;
  input: InputMode;
  clefs: Clef[];
  range: PitchRange;
  durationMinutes: SessionDuration;
  /** Speed mode's per-note deadline; persisted with the settings, not with the session. */
  speedDeadlineMs: number;
  midi: MidiController;
  setMode: (mode: PracticeMode) => void;
  setInput: (input: InputMode) => void;
  setClefs: (clefs: Clef[]) => void;
  setRange: (range: PitchRange) => void;
  setDurationMinutes: (minutes: SessionDuration) => void;
  setSpeedDeadlineMs: (ms: number) => void;
  start: () => void;
  answer: (answer: NormalizedAnswer) => void;
  togglePause: () => void;
  finish: () => void;
  dismissResult: () => void;
};

/**
 * The practice runtime: session setup, question selection, judging, and the
 * end-of-session summary. Persisted progress is written through the callbacks so
 * this module stays independent of how state is stored.
 */
export function usePracticeSession({
  notes,
  speedDeadlineMs,
  onAttempt,
  onSessionComplete,
  onSpeedDeadlineChange,
}: {
  notes: Readonly<Record<string, NoteStats>>;
  speedDeadlineMs: number;
  onAttempt: (itemId: string, stats: NoteStats, outcome: RolledAttempt) => void;
  onSessionComplete: (summary: SessionSummary) => void;
  onSpeedDeadlineChange: (ms: number) => void;
}): PracticeSessionController {
  const [session, setSession] = useState<RuntimeSession | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<SessionSummary | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<SessionDuration>(5);
  const [mode, setMode] = useState<PracticeMode>('practice');
  const [input, setInput] = useState<InputMode>('piano');
  const [range, setRange] = useState<PitchRange>(() =>
    rangeBounds(['treble', 'bass']),
  );
  const [clefs, setClefs] = useState<Clef[]>(['treble', 'bass']);
  const midi = useMidiInput();
  const { connect: connectMidi, subscribe: subscribeMidi } = midi;
  const advanceTimeoutRef = useRef<number | null>(null);
  const notesRef = useRef(notes);
  const onSessionCompleteRef = useRef(onSessionComplete);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    onSessionCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);

  const completeSession = useCallback((runtime: RuntimeSession) => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    const successfulTimes = runtime.outcomes
      .filter(
        (outcome) => outcome.result === 'correct' && outcome.elapsedMs !== null,
      )
      .map((outcome) => outcome.elapsedMs as number);
    const newRecognized = runtime.outcomes
      .filter(
        (outcome) =>
          outcome.stateBefore !== 'recognized' &&
          outcome.stateBefore !== 'fluent' &&
          outcome.stateAfter === 'recognized',
      )
      .map((outcome) => outcome.itemId);
    const newFluent = runtime.outcomes
      .filter(
        (outcome) =>
          outcome.stateBefore !== 'fluent' && outcome.stateAfter === 'fluent',
      )
      .map((outcome) => outcome.itemId);
    const sessionNoteIds = new Set(
      runtime.outcomes.map((outcome) => outcome.itemId),
    );
    const weakest = weakestNotes(
      [...sessionNoteIds]
        .map((id) => notesRef.current[id])
        .filter((note): note is NoteStats => Boolean(note)),
      3,
    ).map((note) => note.itemId);
    const summary: SessionSummary = {
      id: runtime.id,
      startedAt: runtime.startedAt,
      durationSeconds: runtime.durationSeconds,
      mode: runtime.mode,
      speedDeadlineMs: runtime.speedDeadlineMs,
      attempts: runtime.outcomes.length,
      correct: runtime.outcomes.filter(
        (outcome) => outcome.result === 'correct',
      ).length,
      timeouts: runtime.outcomes.filter(
        (outcome) => outcome.result === 'timeout',
      ).length,
      medianResponseMs: median(successfulTimes),
      practiceSeconds: Math.min(
        runtime.durationSeconds,
        Math.round((Date.now() - runtime.startedAt) / 1000),
      ),
      newRecognized: [...new Set(newRecognized)],
      newFluent: [...new Set(newFluent)],
      weakestItemIds: weakest,
    };
    onSessionCompleteRef.current(summary);
    setResult(summary);
    setSession(null);
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (!session || session.paused) return;
    const timer = window.setInterval(() => {
      if (Date.now() - session.startedAt >= session.durationSeconds * 1000)
        completeSession(session);
    }, 250);
    return () => window.clearInterval(timer);
  }, [session, completeSession]);

  const start = useCallback(() => {
    const candidates = selectedItems(clefs, clampRange(range, clefs));
    if (candidates.length === 0) return;
    const first = pickNext(candidates, notes, [], [], 1);
    const now = Date.now();
    setSession({
      id: `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: now,
      durationSeconds: durationMinutes * 60,
      mode,
      speedDeadlineMs,
      input,
      clefs,
      candidates,
      keyboardWindow: windowForMidi(first.pitch.midi),
      current: first,
      currentStartedAt: now,
      deadlineMs: sessionDeadlineMs(mode, speedDeadlineMs),
      questionNumber: 1,
      recentItemIds: [first.id],
      outcomes: [],
      deferredQueue: [],
      paused: false,
      pausedAt: null,
    });
    setFeedback(null);
    setResult(null);
  }, [clefs, durationMinutes, input, mode, notes, range, speedDeadlineMs]);

  const advance = useCallback((runtime: RuntimeSession) => {
    const nextQuestion = runtime.questionNumber + 1;
    const next = pickNext(
      runtime.candidates,
      notesRef.current,
      runtime.recentItemIds,
      runtime.deferredQueue,
      nextQuestion,
    );
    setSession({
      ...runtime,
      current: next,
      keyboardWindow: windowForMidi(next.pitch.midi),
      deferredQueue: runtime.deferredQueue.filter(
        (entry) => entry.item.id !== next.id,
      ),
      currentStartedAt: Date.now(),
      questionNumber: nextQuestion,
      recentItemIds: [...runtime.recentItemIds, next.id].slice(-5),
    });
    setFeedback(null);
  }, []);

  const judge = useCallback(
    (answer: NormalizedAnswer | undefined, resultOverride?: AnswerResult) => {
      if (!session || session.paused || feedback) return;
      const elapsedMs =
        resultOverride === 'timeout'
          ? null
          : Math.max(0, Date.now() - session.currentStartedAt);
      const correct = answer
        ? session.input === 'names'
          ? answer.midi % 12 === session.current.pitch.midi % 12
          : answer.midi === session.current.pitch.midi
        : false;
      const outcomeResult: AnswerResult =
        resultOverride ?? (correct ? 'correct' : 'incorrect');
      const previous =
        notesRef.current[session.current.id] ?? emptyNoteStats(session.current);
      const at = Date.now();
      const nextStats = recordOutcome(previous, {
        result: outcomeResult,
        elapsedMs,
        mode: session.mode,
        input: session.input,
        sessionId: session.id,
        at,
      });
      onAttempt(session.current.id, nextStats, {
        result: outcomeResult,
        elapsedMs,
        mode: session.mode,
        at,
      });
      const outcome: RuntimeOutcome = {
        sessionId: session.id,
        result: outcomeResult,
        elapsedMs,
        mode: session.mode,
        input: session.input,
        at,
        itemId: session.current.id,
        stateBefore: previous.state,
        stateAfter: nextStats.state,
      };
      const deferredQueue =
        outcomeResult === 'correct'
          ? session.deferredQueue
          : requeueAfterWrong(
              session.deferredQueue,
              session.current,
              session.questionNumber,
              3,
            );
      const runtime = {
        ...session,
        outcomes: [...session.outcomes, outcome],
        deferredQueue,
      };
      setSession(runtime);
      setFeedback({
        result: outcomeResult,
        item: session.current,
        elapsedMs,
        answer,
      });
      advanceTimeoutRef.current = window.setTimeout(
        () => {
          advanceTimeoutRef.current = null;
          advance(runtime);
        },
        outcomeResult === 'correct' ? CORRECT_DELAY : CORRECTION_DELAY,
      );
    },
    [advance, feedback, onAttempt, session],
  );

  useEffect(() => {
    if (!session || session.paused || feedback) return;
    if (session.deadlineMs === null) return;
    const remaining = deadlineRemainingMs(
      session.currentStartedAt,
      Date.now(),
      session.deadlineMs,
    );
    const timeout = window.setTimeout(
      () => judge(undefined, 'timeout'),
      remaining,
    );
    return () => window.clearTimeout(timeout);
  }, [feedback, judge, session]);

  const finish = useCallback(() => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (session) completeSession(session);
  }, [completeSession, session]);

  const togglePause = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      if (!current.paused)
        return { ...current, paused: true, pausedAt: Date.now() };
      const pausedFor =
        current.pausedAt === null
          ? 0
          : Math.max(0, Date.now() - current.pausedAt);
      return {
        ...current,
        paused: false,
        pausedAt: null,
        startedAt: current.startedAt + pausedFor,
        currentStartedAt: current.currentStartedAt + pausedFor,
      };
    });
  }, []);

  const answer = useCallback(
    (value: NormalizedAnswer) => judge(value),
    [judge],
  );

  /** A key on the instrument is judged exactly like a tap on the on-screen piano. */
  useEffect(() => {
    if (!session || session.input !== 'midi') return;
    return subscribeMidi((note) => judge(midiAnswer(note)));
  }, [judge, session, subscribeMidi]);

  /**
   * Choosing MIDI is the deliberate press the permission prompt needs, so the
   * connection is opened here rather than when a session starts.
   */
  const chooseInput = useCallback(
    (next: InputMode) => {
      setInput(next);
      if (next === 'midi') connectMidi();
    },
    [connectMidi],
  );
  const setSpeedDeadlineMs = useCallback(
    (ms: number) => onSpeedDeadlineChange(clampSpeedDeadlineMs(ms)),
    [onSpeedDeadlineChange],
  );
  const dismissResult = useCallback(() => setResult(null), []);

  return {
    session,
    feedback,
    result,
    mode,
    input,
    clefs,
    range: clampRange(range, clefs),
    durationMinutes,
    speedDeadlineMs,
    midi,
    setMode,
    setInput: chooseInput,
    setClefs,
    setRange,
    setDurationMinutes,
    setSpeedDeadlineMs,
    start,
    answer,
    togglePause,
    finish,
    dismissResult,
  };
}
