import { describe, expect, it } from 'vitest';

import {
  accuracyOf,
  addAttempt,
  binFor,
  dayKeyOf,
  emptyRoll,
  meanMs,
  pruneRolls,
  quantileMs,
  rollKey,
  rollsWithin,
  totalsOf,
  type DayRoll,
} from '../rollups';

function roll(day: string, times: number[], wrong = 0): DayRoll {
  let value = emptyRoll('treble:C4', day);
  for (const ms of times)
    value = addAttempt(value, {
      result: 'correct',
      elapsedMs: ms,
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

describe('day rollups', () => {
  it('adds counts exactly across days', () => {
    const totals = totalsOf([
      roll('2026-09-07', [800, 900], 2),
      roll('2026-09-08', [1000], 1),
    ]);
    expect(totals.attempts).toBe(6);
    expect(totals.correct).toBe(3);
    expect(accuracyOf(totals)).toBeCloseTo(0.5, 5);
  });

  it('keeps the mean exact through a merge', () => {
    const totals = totalsOf([
      roll('2026-09-07', [1000, 2000]),
      roll('2026-09-08', [3000]),
    ]);
    expect(meanMs(totals)).toBeCloseTo(2000, 5);
  });

  it('only times correct answers', () => {
    const totals = totalsOf([roll('2026-09-07', [1000], 3)]);
    expect(totals.timed).toBe(1);
    expect(meanMs(totals)).toBeCloseTo(1000, 5);
  });

  it('estimates a merged median that daily medians could not give', () => {
    // Ten fast answers one day, one very slow the next. The true median is 1000.
    const totals = totalsOf([
      roll(
        '2026-09-07',
        Array.from({ length: 10 }, () => 1000),
      ),
      roll('2026-09-08', [9000]),
    ]);
    const median = quantileMs(totals, 0.5);
    expect(median).not.toBeNull();
    expect(median!).toBeGreaterThan(900);
    expect(median!).toBeLessThan(1100);
    // The mean is dragged up by the outlier, which is why the median is reported.
    expect(meanMs(totals)!).toBeGreaterThan(1600);
  });

  it('keeps the quantile within one bucket of the truth', () => {
    const times = Array.from({ length: 200 }, (_, index) => 400 + index * 20);
    const totals = totalsOf([roll('2026-09-07', times)]);
    const truth = times[Math.floor(times.length / 2)];
    const estimate = quantileMs(totals, 0.5)!;
    expect(Math.abs(estimate - truth) / truth).toBeLessThan(0.1);
  });

  it('reports no time when nothing was answered correctly', () => {
    const totals = totalsOf([roll('2026-09-07', [], 4)]);
    expect(meanMs(totals)).toBeNull();
    expect(quantileMs(totals)).toBeNull();
  });

  it('places durations in increasing buckets', () => {
    expect(binFor(100)).toBe(0);
    expect(binFor(2000)).toBeGreaterThan(binFor(1000));
    expect(binFor(500_000)).toBeLessThan(48);
  });
});

describe('range selection', () => {
  const now = new Date('2026-09-08T12:00').getTime();
  const rolls: Record<string, DayRoll> = {};
  for (const day of ['2026-09-08', '2026-09-06', '2026-08-20'])
    rolls[rollKey('treble:C4', day)] = roll(day, [1000]);

  it('keeps today and the previous days', () => {
    expect(rollsWithin(rolls, 3, now)).toHaveLength(2);
    expect(rollsWithin(rolls, 30, now)).toHaveLength(3);
  });

  it('keeps everything when no range is given', () => {
    expect(rollsWithin(rolls, null, now)).toHaveLength(3);
  });

  it('drops buckets past the retention window', () => {
    expect(Object.keys(pruneRolls(rolls, 7, now))).toHaveLength(2);
  });
});

describe('dayKeyOf', () => {
  it('uses the local calendar day and sorts as a string', () => {
    expect(dayKeyOf(new Date('2026-09-08T23:30').getTime())).toBe('2026-09-08');
    expect('2026-09-08' > '2026-08-20').toBe(true);
    expect('2026-10-01' > '2026-09-30').toBe(true);
  });
});
