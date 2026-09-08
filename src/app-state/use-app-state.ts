import { useCallback, useEffect, useState } from 'react';

import { browserLocale } from '../i18n/i18n';
import {
  creditNote,
  emptyLevelLesson,
  isPassed,
  lapseNote,
  noteLessonOf,
} from '../learning/lesson-state';
import { findLevel } from '../learning/levels';
import { loadPersistedState, savePersistedState } from '../storage/indexed-db';
import {
  addAttempt,
  dayKeyOf,
  emptyRoll,
  pruneRolls,
  rollKey,
} from '../training/rollups';
import type { NoteStats } from '../training/training';

import {
  createInitialState,
  type AppSettings,
  type PersistedState,
  type SessionSummary,
} from './app-state';

const MAX_STORED_SESSIONS = 100;
/** Two years of buckets; well inside the localStorage mirror's budget. */
const KEEP_ROLL_DAYS = 730;

function initialFromBrowser(): PersistedState {
  const locale = browserLocale();
  return createInitialState({
    locale,
    naming: locale === 'ru' ? 'solfege' : 'letters',
  });
}

export type RolledAttempt = {
  result: 'correct' | 'incorrect' | 'timeout';
  elapsedMs: number | null;
  mode: 'practice' | 'speed';
  at: number;
};

export type AttemptRecord = {
  itemId: string;
  /** The note's running stats for the global map; every answer writes them. */
  stats: NoteStats;
  outcome: RolledAttempt;
};

/** One graded answer inside a Learning run. Retention asks are not graded and never land here. */
export type LessonAnswer = {
  levelId: string;
  itemId: string;
  runId: string;
  correct: boolean;
  at: number;
};

export type AppState = {
  state: PersistedState;
  /** False until the stored state has been read back, so we never overwrite it with defaults. */
  hydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  recordAttempt: (record: AttemptRecord) => void;
  /** Counts a run against the level, so its state exists from the first question. */
  startLearningRun: (levelId: string) => void;
  /** Moves one note of one level forward, or back, on the strength of a single answer. */
  recordLessonAnswer: (answer: LessonAnswer) => void;
  appendSession: (summary: SessionSummary) => void;
  /** Clears every recorded attempt, session, level and day bucket. Settings are not progress, so they stay. */
  resetProgress: () => void;
};

export function useAppState(): AppState {
  const [state, setState] = useState<PersistedState>(initialFromBrowser);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void loadPersistedState().then((saved) => {
      if (saved) setState(saved);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void savePersistedState(state);
  }, [state, hydrated]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  }, []);

  /**
   * One update writes the note's running stats and the day bucket behind the ranges.
   * Both tracks answer through here, so the dashboard reports everything practiced.
   */
  const recordAttempt = useCallback(
    ({ itemId, stats, outcome }: AttemptRecord) => {
      setState((current) => {
        const day = dayKeyOf(outcome.at);
        const key = rollKey(itemId, day);
        const roll = current.rolls[key] ?? emptyRoll(itemId, day);
        return {
          ...current,
          notes: { ...current.notes, [itemId]: stats },
          rolls: {
            ...pruneRolls(current.rolls, KEEP_ROLL_DAYS, outcome.at),
            [key]: addAttempt(roll, outcome),
          },
        };
      });
    },
    [],
  );

  const startLearningRun = useCallback((levelId: string) => {
    setState((current) => {
      const lesson = current.learning.levels[levelId] ?? emptyLevelLesson();
      return {
        ...current,
        learning: {
          levels: {
            ...current.learning.levels,
            [levelId]: { ...lesson, runs: lesson.runs + 1 },
          },
        },
      };
    });
  }, []);

  const recordLessonAnswer = useCallback(
    ({ levelId, itemId, runId, correct, at }: LessonAnswer) => {
      const level = findLevel(levelId);
      if (!level) return;
      setState((current) => {
        const lesson = current.learning.levels[levelId] ?? emptyLevelLesson();
        const note = noteLessonOf(lesson, itemId);
        const notes = {
          ...lesson.notes,
          [itemId]: correct ? creditNote(note, runId, at) : lapseNote(note),
        };
        const complete = level.items.every((item) =>
          isPassed(notes[item.id] ?? noteLessonOf(lesson, item.id), level),
        );
        return {
          ...current,
          learning: {
            levels: {
              ...current.learning.levels,
              [levelId]: {
                ...lesson,
                notes,
                completedAt: complete ? (lesson.completedAt ?? at) : null,
              },
            },
          },
        };
      });
    },
    [],
  );

  const appendSession = useCallback((summary: SessionSummary) => {
    setState((current) => ({
      ...current,
      sessions: [summary, ...current.sessions].slice(0, MAX_STORED_SESSIONS),
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setState((current) => createInitialState(current.settings));
  }, []);

  return {
    state,
    hydrated,
    updateSettings,
    recordAttempt,
    startLearningRun,
    recordLessonAnswer,
    appendSession,
    resetProgress,
  };
}
