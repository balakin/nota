import { useCallback, useEffect, useState } from 'react';

import { browserLocale } from '../i18n/i18n';
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

export type AppState = {
  state: PersistedState;
  /** False until the stored state has been read back, so we never overwrite it with defaults. */
  hydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  recordAttempt: (
    itemId: string,
    stats: NoteStats,
    outcome: RolledAttempt,
  ) => void;
  appendSession: (summary: SessionSummary) => void;
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

  /** One update writes both the note's running stats and the day bucket behind the ranges. */
  const recordAttempt = useCallback(
    (itemId: string, stats: NoteStats, outcome: RolledAttempt) => {
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

  const appendSession = useCallback((summary: SessionSummary) => {
    setState((current) => ({
      ...current,
      sessions: [summary, ...current.sessions].slice(0, MAX_STORED_SESSIONS),
    }));
  }, []);

  return { state, hydrated, updateSettings, recordAttempt, appendSession };
}
