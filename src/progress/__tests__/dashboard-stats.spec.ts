import { describe, expect, it } from 'vitest';

import type { SessionSummary } from '../../app-state/app-state';
import {
  addAttempt,
  dayKeyOf,
  emptyRoll,
  rollKey,
  type DayRoll,
} from '../../training/rollups';
import { dashboardStats } from '../dashboard-stats';

const NOW = new Date('2026-09-08T12:00').getTime();

function roll(
  itemId: string,
  day: string,
  correct: number,
  wrong = 0,
): DayRoll {
  let value = emptyRoll(itemId, day);
  for (let index = 0; index < correct; index += 1)
    value = addAttempt(value, {
      result: 'correct',
      elapsedMs: 1000,
      mode: 'practice',
    });
  for (let index = 0; index < wrong; index += 1)
    value = addAttempt(value, {
      result: 'incorrect',
      elapsedMs: null,
      mode: 'practice',
    });
  return value;
}

function store(...rolls: DayRoll[]): Record<string, DayRoll> {
  return Object.fromEntries(
    rolls.map((one) => [rollKey(one.itemId, one.day), one]),
  );
}

function session(day: string, seconds: number): SessionSummary {
  return {
    id: day,
    startedAt: new Date(`${day}T10:00`).getTime(),
    durationSeconds: seconds,
    mode: 'practice',
    attempts: 10,
    correct: 8,
    timeouts: 0,
    medianResponseMs: 1000,
    practiceSeconds: seconds,
    newRecognized: [],
    newFluent: [],
    weakestItemIds: [],
  };
}

function run(
  days: number | null,
  rolls: Record<string, DayRoll>,
  sessions: SessionSummary[] = [],
) {
  return dashboardStats({ rolls, sessions, days, now: NOW, dayOf: dayKeyOf });
}

describe('dashboardStats', () => {
  const rolls = store(
    roll('treble:C4', '2026-09-08', 8, 2),
    roll('treble:D4', '2026-09-07', 5, 5),
    roll('treble:E4', '2026-08-30', 10, 0), // older than 7d, inside 30d
  );

  it('counts only the buckets inside the range', () => {
    expect(run(7, rolls).totals.attempts).toBe(20);
    expect(run(30, rolls).totals.attempts).toBe(30);
    expect(run(null, rolls).totals.attempts).toBe(30);
  });

  it('reports accuracy exactly from merged counts', () => {
    const stats = run(7, rolls);
    expect(stats.totals.correct / stats.totals.attempts).toBeCloseTo(0.65, 5);
  });

  it('counts distinct notes practiced in the range', () => {
    expect(run(7, rolls).practicedItems).toBe(2);
    expect(run(30, rolls).practicedItems).toBe(3);
  });

  it('compares against the preceding window of the same length', () => {
    const withHistory = store(
      roll('treble:C4', '2026-09-08', 9, 1),
      // 7d covers 09-02..09-08, so the preceding window is 08-26..09-01.
      roll('treble:C4', '2026-08-30', 4, 6),
    );
    const stats = run(7, withHistory);
    expect(stats.totals.attempts).toBe(10);
    expect(stats.previous?.attempts).toBe(10);
    expect(stats.previous?.correct).toBe(4);
  });

  it('has nothing to compare against over all time', () => {
    expect(run(null, rolls).previous).toBeNull();
    expect(run(null, rolls).previousPracticeSeconds).toBeNull();
  });

  it('keeps last seen from all history, not just the range', () => {
    const stats = run(7, rolls);
    expect(stats.lastSeenByItem['treble:E4']).toBe('2026-08-30');
    expect(stats.byItem['treble:E4']).toBeUndefined();
  });

  it('builds one dated point per day, oldest first', () => {
    const stats = run(30, rolls);
    expect(stats.days.map((point) => point.day)).toEqual([
      '2026-08-30',
      '2026-09-07',
      '2026-09-08',
    ]);
    expect(stats.days[2].accuracy).toBe(80);
    expect(stats.days[2].attempts).toBe(10);
  });

  it('sums practice seconds from the sessions in range', () => {
    const sessions = [session('2026-09-08', 300), session('2026-08-30', 600)];
    expect(run(7, rolls, sessions).practiceSeconds).toBe(300);
    expect(run(30, rolls, sessions).practiceSeconds).toBe(900);
  });

  it('is empty rather than wrong when the range holds nothing', () => {
    const stats = run(7, store(roll('treble:C4', '2026-01-01', 5)));
    expect(stats.totals.attempts).toBe(0);
    expect(stats.practicedItems).toBe(0);
    expect(stats.days).toEqual([]);
  });
});
