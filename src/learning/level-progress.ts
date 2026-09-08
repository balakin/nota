import type { NoteStats } from '../training/training';

import { LEVELS, type Level } from './levels';

export type LevelStatus = 'locked' | 'available' | 'complete';

export type LevelProgress = {
  level: Level;
  status: LevelStatus;
  /** Notes of the level already learned on this path. */
  learned: number;
  total: number;
};

/**
 * A note counts as learned once the mastery engine has moved it off `new` — eight
 * attempts, four in five correct, and a median under two and a half seconds. The
 * Learning path keeps its own chain of stats, so Train practice never opens a level.
 */
export function isLearned(stats: NoteStats | undefined): boolean {
  return stats !== undefined && stats.state !== 'new';
}

export function learnedItemIds(
  level: Level,
  notes: Readonly<Record<string, NoteStats>>,
): string[] {
  return level.items
    .filter((item) => isLearned(notes[item.id]))
    .map((item) => item.id);
}

/** Every level in order, each gated behind the completion of the one before it. */
export function levelProgress(
  notes: Readonly<Record<string, NoteStats>>,
  levels: readonly Level[] = LEVELS,
): LevelProgress[] {
  let previousComplete = true;
  return levels.map((level) => {
    const learned = learnedItemIds(level, notes).length;
    const complete = learned === level.items.length;
    const status: LevelStatus = complete
      ? 'complete'
      : previousComplete
        ? 'available'
        : 'locked';
    previousComplete = previousComplete && complete;
    return { level, status, learned, total: level.items.length };
  });
}

/** The level the path is waiting on: the first one not yet finished. */
export function currentLevel(
  progress: readonly LevelProgress[],
): LevelProgress | null {
  return progress.find((entry) => entry.status === 'available') ?? null;
}

export function pathTotals(progress: readonly LevelProgress[]): {
  learned: number;
  total: number;
  levelsComplete: number;
} {
  return {
    learned: progress.reduce((sum, entry) => sum + entry.learned, 0),
    total: progress.reduce((sum, entry) => sum + entry.total, 0),
    levelsComplete: progress.filter((entry) => entry.status === 'complete')
      .length,
  };
}
