import type { NamingSystem } from '../music/music';
import { CURRICULUM, type Clef, type RecognitionItem } from '../music/music';
import { emptyNoteStats, type NoteStats } from '../training/training';

export type Locale = 'en' | 'ru';
export type Theme = 'system' | 'light' | 'dark';

export type AppSettings = {
  locale: Locale;
  naming: NamingSystem;
  theme: Theme;
  hasCompletedOnboarding: boolean;
};

export type SessionSummary = {
  id: string;
  startedAt: number;
  durationSeconds: number;
  mode: 'practice' | 'speed';
  attempts: number;
  correct: number;
  timeouts: number;
  medianResponseMs: number | null;
  practiceSeconds: number;
  newRecognized: string[];
  newFluent: string[];
  weakestItemIds: string[];
};

export type PersistedState = {
  schemaVersion: 1;
  settings: AppSettings;
  notes: Record<string, NoteStats>;
  sessions: SessionSummary[];
};

export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'en',
  naming: 'letters',
  theme: 'system',
  hasCompletedOnboarding: false,
};

export function allRecognitionItems(): RecognitionItem[] {
  return [...CURRICULUM.treble, ...CURRICULUM.bass];
}

export function createInitialState(settings: Partial<AppSettings> = {}): PersistedState {
  const notes = Object.fromEntries(
    allRecognitionItems().map((item) => [item.id, emptyNoteStats(item)]),
  );
  return { schemaVersion: 1, settings: { ...DEFAULT_SETTINGS, ...settings }, notes, sessions: [] };
}

export function migrateState(value: unknown): PersistedState {
  const initial = createInitialState();
  if (!value || typeof value !== 'object') return initial;
  const candidate = value as Partial<PersistedState>;
  const settings = { ...DEFAULT_SETTINGS, ...(candidate.settings ?? {}) };
  const storedNotes = candidate.notes && typeof candidate.notes === 'object' ? candidate.notes : {};
  const notes = Object.fromEntries(
    allRecognitionItems().map((item) => [
      item.id,
      {
        ...initial.notes[item.id],
        ...(storedNotes as Record<string, Partial<NoteStats>>)[item.id],
      },
    ]),
  );
  return {
    schemaVersion: 1,
    settings: {
      locale: settings.locale === 'ru' ? 'ru' : 'en',
      naming: settings.naming === 'solfege' ? 'solfege' : 'letters',
      theme: settings.theme === 'light' || settings.theme === 'dark' ? settings.theme : 'system',
      hasCompletedOnboarding: Boolean(settings.hasCompletedOnboarding),
    },
    notes,
    sessions: Array.isArray(candidate.sessions) ? candidate.sessions.slice(0, 100) : [],
  };
}

export function clefForItemId(id: string): Clef | null {
  if (id.startsWith('treble:')) return 'treble';
  if (id.startsWith('bass:')) return 'bass';
  return null;
}
