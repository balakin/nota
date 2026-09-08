import {
  emptyLevelLesson,
  type LearningLevels,
  type LevelLesson,
  type NoteLesson,
} from '../learning/lesson-state';
import { LEVELS } from '../learning/levels';
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
 * The Learning path grades its levels on the runs taken inside them, note by note, so it
 * carries its own state rather than reading the global note map. A Learning answer still
 * updates `notes` and `rolls` — the progress dashboard reports everything practiced — but
 * only these credits open a level.
 */
export type LearningState = {
  levels: LearningLevels;
};

export type PersistedState = {
  schemaVersion: 4;
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
    schemaVersion: 4,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    notes: freshNotes(),
    learning: { levels: {} },
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

function readNoteLesson(value: unknown): NoteLesson | null {
  if (!value || typeof value !== 'object') return null;
  const stored = value as Partial<NoteLesson>;
  if (typeof stored.credits !== 'number' || !Number.isFinite(stored.credits))
    return null;
  return {
    introduced: Boolean(stored.introduced),
    credits: Math.max(0, Math.round(stored.credits)),
    lastRunId: typeof stored.lastRunId === 'string' ? stored.lastRunId : null,
    lastCreditAt:
      typeof stored.lastCreditAt === 'number' ? stored.lastCreditAt : 0,
    lapses: typeof stored.lapses === 'number' ? Math.max(0, stored.lapses) : 0,
  };
}

/**
 * The path used to grade itself on a second chain of `NoteStats`. Anything it had already
 * taught is carried over as a finished note rather than asked for again from nothing.
 */
function levelsFromLegacyNotes(value: unknown): LearningLevels {
  if (!value || typeof value !== 'object') return {};
  const stored = value as Record<string, Partial<NoteStats>>;
  const levels: LearningLevels = {};
  for (const level of LEVELS) {
    const notes: Record<string, NoteLesson> = {};
    for (const item of level.items) {
      if (!stored[item.id] || stored[item.id].state === 'new') continue;
      notes[item.id] = {
        introduced: true,
        credits: level.credits,
        lastRunId: null,
        lastCreditAt: stored[item.id].lastPracticedAt ?? 0,
        lapses: 0,
      };
    }
    if (Object.keys(notes).length > 0)
      levels[level.id] = { ...emptyLevelLesson(), notes };
  }
  return levels;
}

function readLearning(value: unknown): LearningState {
  if (!value || typeof value !== 'object') return { levels: {} };
  const candidate = value as { levels?: unknown; notes?: unknown };
  if (!candidate.levels || typeof candidate.levels !== 'object')
    return { levels: levelsFromLegacyNotes(candidate.notes) };
  const known = new Set(LEVELS.map((level) => level.id));
  const levels: LearningLevels = {};
  for (const [levelId, stored] of Object.entries(
    candidate.levels as Record<string, Partial<LevelLesson>>,
  )) {
    if (!known.has(levelId) || !stored || typeof stored !== 'object') continue;
    const notes: Record<string, NoteLesson> = {};
    for (const [itemId, note] of Object.entries(stored.notes ?? {})) {
      const parsed = readNoteLesson(note);
      if (parsed) notes[itemId] = parsed;
    }
    levels[levelId] = {
      notes,
      runs: typeof stored.runs === 'number' ? Math.max(0, stored.runs) : 0,
      completedAt:
        typeof stored.completedAt === 'number' ? stored.completedAt : null,
    };
  }
  return { levels };
}

export function migrateState(value: unknown): PersistedState {
  if (!value || typeof value !== 'object') return createInitialState();
  const candidate = value as Partial<PersistedState>;
  const settings = { ...DEFAULT_SETTINGS, ...(candidate.settings ?? {}) };
  const stored = readRolls((candidate as { rolls?: unknown }).rolls);
  return {
    schemaVersion: 4,
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
    learning: readLearning(candidate.learning),
    sessions: readSessions(candidate.sessions),
    rolls: stored ?? {},
  };
}
