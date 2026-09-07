import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionSummary } from '../app-state/app-state';
import type { Clef } from '../music/music';
import { windowForMidi } from '../piano/piano-layout';
import type { NormalizedAnswer } from '../training/input';
import {
  adaptiveDeadlineMs,
  deadlineRemainingMs,
  emptyNoteStats,
  median,
  recordOutcome,
  requeueAfterWrong,
  unlockedItems,
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

export type PracticeSessionController = {
  session: RuntimeSession | null;
  feedback: Feedback | null;
  result: SessionSummary | null;
  mode: PracticeMode;
  input: InputMode;
  clefs: Clef[];
  durationMinutes: SessionDuration;
  setMode: (mode: PracticeMode) => void;
  setInput: (input: InputMode) => void;
  setClefs: (clefs: Clef[]) => void;
  setDurationMinutes: (minutes: SessionDuration) => void;
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
  onNoteStats,
  onSessionComplete,
}: {
  notes: Readonly<Record<string, NoteStats>>;
  onNoteStats: (itemId: string, stats: NoteStats) => void;
  onSessionComplete: (summary: SessionSummary) => void;
}): PracticeSessionController {
  const [session, setSession] = useState<RuntimeSession | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<SessionSummary | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<SessionDuration>(5);
  const [mode, setMode] = useState<PracticeMode>('practice');
  const [input, setInput] = useState<InputMode>('piano');
  const [clefs, setClefs] = useState<Clef[]>(['treble', 'bass']);
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
      .filter((outcome) => outcome.result === 'correct' && outcome.elapsedMs !== null)
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
      .filter((outcome) => outcome.stateBefore !== 'fluent' && outcome.stateAfter === 'fluent')
      .map((outcome) => outcome.itemId);
    const sessionNoteIds = new Set(runtime.outcomes.map((outcome) => outcome.itemId));
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
      attempts: runtime.outcomes.length,
      correct: runtime.outcomes.filter((outcome) => outcome.result === 'correct').length,
      timeouts: runtime.outcomes.filter((outcome) => outcome.result === 'timeout').length,
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
    const candidates = unlockedItems(notes, clefs);
    if (candidates.length === 0) return;
    const first = pickNext(candidates, notes, [], [], 1);
    const now = Date.now();
    setSession({
      id: `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: now,
      durationSeconds: durationMinutes * 60,
      mode,
      input,
      clefs,
      candidates,
      keyboardWindow: windowForMidi(first.pitch.midi),
      current: first,
      currentStartedAt: now,
      deadlineMs: adaptiveDeadlineMs(notes[first.id] ?? emptyNoteStats(first), mode),
      questionNumber: 1,
      recentItemIds: [first.id],
      outcomes: [],
      deferredQueue: [],
      paused: false,
      pausedAt: null,
    });
    setFeedback(null);
    setResult(null);
  }, [clefs, durationMinutes, input, mode, notes]);

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
      deferredQueue: runtime.deferredQueue.filter((entry) => entry.item.id !== next.id),
      currentStartedAt: Date.now(),
      deadlineMs: adaptiveDeadlineMs(
        notesRef.current[next.id] ?? emptyNoteStats(next),
        runtime.mode,
      ),
      questionNumber: nextQuestion,
      recentItemIds: [...runtime.recentItemIds, next.id].slice(-5),
    });
    setFeedback(null);
  }, []);

  const judge = useCallback(
    (answer: NormalizedAnswer | undefined, resultOverride?: AnswerResult) => {
      if (!session || session.paused || feedback) return;
      const elapsedMs =
        resultOverride === 'timeout' ? null : Math.max(0, Date.now() - session.currentStartedAt);
      const correct = answer
        ? session.input === 'names'
          ? answer.midi % 12 === session.current.pitch.midi % 12
          : answer.midi === session.current.pitch.midi
        : false;
      const outcomeResult: AnswerResult = resultOverride ?? (correct ? 'correct' : 'incorrect');
      const previous = notesRef.current[session.current.id] ?? emptyNoteStats(session.current);
      const nextStats = recordOutcome(previous, {
        result: outcomeResult,
        elapsedMs,
        mode: session.mode,
        input: session.input,
        sessionId: session.id,
      });
      onNoteStats(session.current.id, nextStats);
      const outcome: RuntimeOutcome = {
        sessionId: session.id,
        result: outcomeResult,
        elapsedMs,
        mode: session.mode,
        input: session.input,
        at: Date.now(),
        itemId: session.current.id,
        stateBefore: previous.state,
        stateAfter: nextStats.state,
      };
      const deferredQueue =
        outcomeResult === 'correct'
          ? session.deferredQueue
          : requeueAfterWrong(session.deferredQueue, session.current, session.questionNumber, 3);
      const runtime = {
        ...session,
        outcomes: [...session.outcomes, outcome],
        deferredQueue,
      };
      setSession(runtime);
      setFeedback({ result: outcomeResult, item: session.current, elapsedMs, answer });
      advanceTimeoutRef.current = window.setTimeout(
        () => {
          advanceTimeoutRef.current = null;
          advance(runtime);
        },
        outcomeResult === 'correct' ? CORRECT_DELAY : CORRECTION_DELAY,
      );
    },
    [advance, feedback, onNoteStats, session],
  );

  useEffect(() => {
    if (!session || session.paused || feedback) return;
    if (session.deadlineMs === null) return;
    const remaining = deadlineRemainingMs(session.currentStartedAt, Date.now(), session.deadlineMs);
    const timeout = window.setTimeout(() => judge(undefined, 'timeout'), remaining);
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
      if (!current.paused) return { ...current, paused: true, pausedAt: Date.now() };
      const pausedFor = current.pausedAt === null ? 0 : Math.max(0, Date.now() - current.pausedAt);
      return {
        ...current,
        paused: false,
        pausedAt: null,
        startedAt: current.startedAt + pausedFor,
        currentStartedAt: current.currentStartedAt + pausedFor,
      };
    });
  }, []);

  const answer = useCallback((value: NormalizedAnswer) => judge(value), [judge]);
  const dismissResult = useCallback(() => setResult(null), []);

  return {
    session,
    feedback,
    result,
    mode,
    input,
    clefs,
    durationMinutes,
    setMode,
    setInput,
    setClefs,
    setDurationMinutes,
    start,
    answer,
    togglePause,
    finish,
    dismissResult,
  };
}
