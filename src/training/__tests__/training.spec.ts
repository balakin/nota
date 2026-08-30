import { describe, expect, it } from 'vitest';
import { pitch, recognitionItem } from '../../music/music';
import {
  accuracy,
  adaptiveDeadlineMs,
  emptyNoteStats,
  median,
  recordOutcome,
  requeueAfterWrong,
  SPEED_DEADLINE_MS,
  weakestNotes,
} from '../training';

describe('training engine', () => {
  const item = recognitionItem('treble', pitch('G', 4));

  it('keeps the speed deadline deterministic and compresses stable practice', () => {
    expect(SPEED_DEADLINE_MS).toBe(2000);
    expect(adaptiveDeadlineMs({ state: 'new' }, 'practice')).toBeNull();
    expect(adaptiveDeadlineMs({ state: 'recognized' }, 'practice')).toBe(3000);
    expect(adaptiveDeadlineMs({ state: 'fluent' }, 'practice')).toBe(2500);
    expect(adaptiveDeadlineMs({ state: 'new' }, 'speed')).toBe(2000);
  });

  it('calculates a stable median', () => {
    expect(median([900, 1100, 1000])).toBe(1000);
    expect(median([900, 1100])).toBe(1000);
  });

  it('records timeout separately and moves a new note to learning', () => {
    const next = recordOutcome(emptyNoteStats(item), {
      result: 'timeout',
      elapsedMs: null,
      mode: 'speed',
      sessionId: 's1',
      at: 100,
    });
    expect(next.state).toBe('learning');
    expect(next.timeouts).toBe(1);
    expect(next.speedAttempts).toBe(1);
    expect(accuracy(next)).toBe(0);
  });

  it('requires repeated, multi-session speed evidence for fluent', () => {
    let stats = emptyNoteStats(item);
    for (let index = 0; index < 20; index += 1) {
      stats = recordOutcome(stats, {
        result: 'correct',
        elapsedMs: 900 + (index % 3) * 20,
        mode: 'speed',
        sessionId: index < 10 ? 's1' : 's2',
        at: index + 1,
      });
    }
    expect(stats.state).toBe('fluent');
  });

  it('requeues errors after other questions rather than immediately', () => {
    const queue = requeueAfterWrong([], item, 2, 3);
    expect(queue[0].notBeforeQuestion).toBe(5);
  });

  it('ranks a weak note ahead of a fluent note', () => {
    const weak = recordOutcome(emptyNoteStats(item), {
      result: 'incorrect',
      elapsedMs: 1200,
      mode: 'practice',
      sessionId: 'weak',
      at: 1,
    });
    const strong = {
      ...emptyNoteStats(recognitionItem('bass', pitch('C', 3))),
      state: 'fluent' as const,
      totalAttempts: 20,
      correctAttempts: 20,
    };
    expect(weakestNotes([strong, weak], 1)[0]).toEqual(weak);
  });
});
