import { describe, expect, it } from 'vitest';

import { emptyNoteStats, type NoteStats } from '../../training/training';
import { currentLevel, levelProgress, pathTotals } from '../level-progress';
import { LEVELS } from '../levels';

/** Notes of the given levels marked as the path counts them: learned. */
function learned(...levelIndexes: number[]): Record<string, NoteStats> {
  return Object.fromEntries(
    levelIndexes.flatMap((index) =>
      LEVELS[index].items.map((item) => [
        item.id,
        { ...emptyNoteStats(item), state: 'recognized' as const },
      ]),
    ),
  );
}

describe('level gating', () => {
  it('opens only the first level on a fresh path', () => {
    const progress = levelProgress({});
    expect(progress[0].status).toBe('available');
    expect(progress.slice(1).every((entry) => entry.status === 'locked')).toBe(
      true,
    );
    expect(currentLevel(progress)?.level.id).toBe(LEVELS[0].id);
  });

  it('opens the next level only once the one before it is finished', () => {
    const progress = levelProgress(learned(0));
    expect(progress[0].status).toBe('complete');
    expect(progress[1].status).toBe('available');
    expect(progress[2].status).toBe('locked');
    expect(currentLevel(progress)?.level.id).toBe(LEVELS[1].id);
  });

  it('keeps a later level locked while an earlier one is unfinished', () => {
    const progress = levelProgress(learned(1));
    expect(progress[0].status).toBe('available');
    expect(progress[1].status).toBe('complete');
    /* Finished out of order, level three still waits on level one. */
    expect(progress[2].status).toBe('locked');
  });

  it('counts a half-finished level towards the path total', () => {
    const first = LEVELS[0];
    const half = Object.fromEntries(
      first.items
        .slice(0, 3)
        .map((item) => [
          item.id,
          { ...emptyNoteStats(item), state: 'fluent' as const },
        ]),
    );
    const progress = levelProgress(half);
    expect(progress[0]).toMatchObject({
      status: 'available',
      learned: 3,
      total: first.items.length,
    });
    expect(pathTotals(progress)).toMatchObject({
      learned: 3,
      levelsComplete: 0,
    });
  });

  it('reports no current level once every level is done', () => {
    const progress = levelProgress(learned(...LEVELS.map((_, index) => index)));
    expect(currentLevel(progress)).toBeNull();
    expect(pathTotals(progress).levelsComplete).toBe(LEVELS.length);
  });
});
