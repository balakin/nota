import type { NamingSystem } from '../music/music';
import { allRecognitionItems } from '../music/recognition-items';
import { emptyRoll, type DayRoll } from '../training/rollups';
import {
  clampSpeedDeadlineMs,
  DEFAULT_SPEED_DEADLINE_MS,
  emptyNoteStats,
  type NoteStats,
  type TrainingTrack,
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
  /** Which track ran the session; sessions recorded before the Learning path are Train's. */
  track: TrainingTrack;
  /** The level a Learning session ran, absent on Train sessions. */
  levelId?: string;
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

/**
 * The Learning path grades its levels on answers given inside it, so it carries its own
 * chain of note stats. A Learning answer still updates `notes` and `rolls` — the progress
 * dashboard reports everything practiced — but only this chain opens the next level.
 */
export type LearningState = {
  notes: Record<string, NoteStats>;
};

export type PersistedState = {
  schemaVersion: 3;
  settings: AppSettings;
  notes: Record<string, NoteStats>;
  learning: LearningState;
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

function freshNotes(): Record<string, NoteStats> {
  return Object.fromEntries(
    allRecognitionItems().map((item) => [item.id, emptyNoteStats(item)]),
  );
}

/** One entry per curriculum item, stored values kept and unknown ids dropped. */
function notesFrom(value: unknown): Record<string, NoteStats> {
  const stored =
    value && typeof value === 'object'
      ? (value as Record<string, Partial<NoteStats>>)
      : {};
  return Object.fromEntries(
    allRecognitionItems().map((item) => [
      item.id,
      { ...emptyNoteStats(item), ...stored[item.id] },
    ]),
  );
}

export function createInitialState(
  settings: Partial<AppSettings> = {},
): PersistedState {
  return {
    schemaVersion: 3,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    notes: freshNotes(),
    learning: { notes: freshNotes() },
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

function readSessions(value: unknown): SessionSummary[] {
  if (!Array.isArray(value)) return [];
  return (value as SessionSummary[]).slice(0, 100).map((summary) => ({
    ...summary,
    track: summary.track === 'learning' ? 'learning' : 'train',
  }));
}

export function migrateState(value: unknown): PersistedState {
  if (!value || typeof value !== 'object') return createInitialState();
  const candidate = value as Partial<PersistedState>;
  const settings = { ...DEFAULT_SETTINGS, ...(candidate.settings ?? {}) };
  const stored = readRolls((candidate as { rolls?: unknown }).rolls);
  return {
    schemaVersion: 3,
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
    notes: notesFrom(candidate.notes),
    /* A state saved before the Learning path has no chain of its own: the path starts fresh. */
    learning: { notes: notesFrom(candidate.learning?.notes) },
    sessions: readSessions(candidate.sessions),
    rolls: stored ?? {},
  };
}
