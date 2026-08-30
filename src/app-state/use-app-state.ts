import { useCallback, useEffect, useState } from 'react';
import { browserLocale } from '../i18n/i18n';
import { loadPersistedState, savePersistedState } from '../storage/indexed-db';
import type { NoteStats } from '../training/training';
import {
  createInitialState,
  type AppSettings,
  type PersistedState,
  type SessionSummary,
} from './app-state';

const MAX_STORED_SESSIONS = 100;

function initialFromBrowser(): PersistedState {
  const locale = browserLocale();
  return createInitialState({ locale, naming: locale === 'ru' ? 'solfege' : 'letters' });
}

export type AppState = {
  state: PersistedState;
  /** False until the stored state has been read back, so we never overwrite it with defaults. */
  hydrated: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  recordNoteStats: (itemId: string, stats: NoteStats) => void;
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
    setState((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }, []);

  const recordNoteStats = useCallback((itemId: string, stats: NoteStats) => {
    setState((current) => ({ ...current, notes: { ...current.notes, [itemId]: stats } }));
  }, []);

  const appendSession = useCallback((summary: SessionSummary) => {
    setState((current) => ({
      ...current,
      sessions: [summary, ...current.sessions].slice(0, MAX_STORED_SESSIONS),
    }));
  }, []);

  return { state, hydrated, updateSettings, recordNoteStats, appendSession };
}
