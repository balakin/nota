import type { NamingSystem } from '../music/music';
import { allRecognitionItems } from '../music/recognition-items';
import { emptyRoll, type DayRoll } from '../training/rollups';
import {
  clampSpeedDeadlineMs,
  DEFAULT_SPEED_DEADLINE_MS,
  emptyNoteStats,
  type NoteStats,
} from '../training/training';

export type Locale = 'en' | 'ru';
export type Theme = 'system' | 'light' | 'dark';

export type AppSettings = {
  locale: Locale;
  naming: NamingSystem;
  theme: Theme;
  /** Speed mode's per-note deadline, in milliseconds. */
  speedDeadlineMs: number;
  hasCompletedOnboarding: boolean;
};

export type SessionSummary = {
  id: string;
  startedAt: number;
  durationSeconds: number;
  mode: 'practice' | 'speed';
  /** The Speed deadline the session ran with; absent on sessions recorded before it was choosable. */
  speedDeadlineMs?: number;
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
  schemaVersion: 2;
  settings: AppSettings;
  notes: Record<string, NoteStats>;
  sessions: SessionSummary[];
  /** Per-note, per-day buckets keyed `day|itemId`. The source for every ranged stat. */
  rolls: Record<string, DayRoll>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  locale: 'en',
  naming: 'letters',
  theme: 'system',
  speedDeadlineMs: DEFAULT_SPEED_DEADLINE_MS,
  hasCompletedOnboarding: false,
};

export function createInitialState(
  settings: Partial<AppSettings> = {},
): PersistedState {
  const notes = Object.fromEntries(
    allRecognitionItems().map((item) => [item.id, emptyNoteStats(item)]),
  );
  return {
    schemaVersion: 2,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    notes,
    sessions: [],
    rolls: {},
  };
}

function readRolls(value: unknown): Record<string, DayRoll> | null {
  if (!value || typeof value !== 'object') return null;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, roll]) =>
      roll !== null &&
      typeof roll === 'object' &&
      typeof (roll as DayRoll).day === 'string' &&
      typeof (roll as DayRoll).itemId === 'string',
  );
  return Object.fromEntries(
    entries.map(([key, roll]) => [
      key,
      { ...emptyRoll('', ''), ...(roll as DayRoll) },
    ]),
  );
}

export function migrateState(value: unknown): PersistedState {
  const initial = createInitialState();
  if (!value || typeof value !== 'object') return initial;
  const candidate = value as Partial<PersistedState>;
  const settings = { ...DEFAULT_SETTINGS, ...(candidate.settings ?? {}) };
  const storedNotes =
    candidate.notes && typeof candidate.notes === 'object'
      ? candidate.notes
      : {};
  const notes = Object.fromEntries(
    allRecognitionItems().map((item) => [
      item.id,
      {
        ...initial.notes[item.id],
        ...(storedNotes as Record<string, Partial<NoteStats>>)[item.id],
      },
    ]),
  );
  const stored = readRolls((candidate as { rolls?: unknown }).rolls);
  return {
    schemaVersion: 2,
    settings: {
      locale: settings.locale === 'ru' ? 'ru' : 'en',
      naming: settings.naming === 'solfege' ? 'solfege' : 'letters',
      theme:
        settings.theme === 'light' || settings.theme === 'dark'
          ? settings.theme
          : 'system',
      speedDeadlineMs: clampSpeedDeadlineMs(settings.speedDeadlineMs),
      hasCompletedOnboarding: Boolean(settings.hasCompletedOnboarding),
    },
    notes,
    sessions: Array.isArray(candidate.sessions)
      ? candidate.sessions.slice(0, 100)
      : [],
    rolls: stored ?? {},
  };
}
