import { describe, expect, it } from 'vitest';

import type { SessionSummary } from '../../app-state/app-state';
import { sessionsByDay, withinDays } from '../session-series';

function session(
  at: string,
  attempts: number,
  correct: number,
  medianResponseMs: number | null = 1000,
): SessionSummary {
  return {
    id: at,
    startedAt: new Date(at).getTime(),
    durationSeconds: 300,
    mode: 'practice',
    attempts,
    correct,
    timeouts: 0,
    medianResponseMs,
    practiceSeconds: 240,
    newRecognized: [],
    newFluent: [],
    weakestItemIds: [],
  };
}

describe('sessionsByDay', () => {
  it('merges every session of one day into a single point', () => {
    const points = sessionsByDay([
      session('2026-09-07T09:00', 10, 5),
      session('2026-09-07T21:00', 30, 30),
    ]);
    expect(points).toHaveLength(1);
    expect(points[0].sessions).toBe(2);
    expect(points[0].attempts).toBe(40);
    // Pooled over notes, not the mean of 50% and 100%.
    expect(points[0].accuracy).toBe(88);
  });

  it('weights merged response times by attempts', () => {
    const points = sessionsByDay([
      session('2026-09-07T09:00', 10, 10, 3000),
      session('2026-09-07T21:00', 30, 30, 1000),
    ]);
    expect(points[0].seconds).toBeCloseTo(1.5, 5);
  });

  it('orders days oldest first however the sessions arrive', () => {
    const points = sessionsByDay([
      session('2026-09-08T10:00', 5, 5),
      session('2026-09-06T10:00', 5, 5),
      session('2026-09-07T10:00', 5, 5),
    ]);
    expect(points.map((point) => point.day)).toEqual([
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
    ]);
  });

  it('drops a day that answered nothing rather than plotting it as 0%', () => {
    expect(sessionsByDay([session('2026-09-07T10:00', 0, 0, null)])).toEqual(
      [],
    );
  });

  it('reports no response time when no session recorded one', () => {
    const points = sessionsByDay([session('2026-09-07T10:00', 4, 2, null)]);
    expect(points[0].seconds).toBeNull();
  });
});

describe('withinDays', () => {
  const now = new Date('2026-09-08T15:00').getTime();

  it('keeps today and the previous days, counted as calendar days', () => {
    const sessions = [
      session('2026-09-08T01:00', 1, 1),
      session('2026-09-06T23:00', 1, 1),
      session('2026-09-05T23:00', 1, 1),
    ];
    expect(withinDays(sessions, 3, now)).toHaveLength(2);
  });

  it('keeps an early morning session on the oldest day in range', () => {
    const sessions = [session('2026-09-06T00:30', 1, 1)];
    expect(withinDays(sessions, 3, now)).toHaveLength(1);
  });
});
