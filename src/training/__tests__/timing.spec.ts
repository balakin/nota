import { describe, expect, it } from 'vitest';

import {
  clampSpeedDeadlineMs,
  deadlineRemainingMs,
  DEFAULT_SPEED_DEADLINE_MS,
  isDeadlineReached,
  SPEED_DEADLINE_OPTIONS_MS,
} from '../training';

describe('speed timing contract', () => {
  it('defaults the Speed deadline to exactly two seconds', () => {
    const startedAt = 10_000;
    const deadline = DEFAULT_SPEED_DEADLINE_MS;
    expect(deadline).toBe(2_000);
    expect(deadlineRemainingMs(startedAt, 11_999, deadline)).toBe(1);
    expect(isDeadlineReached(startedAt, 11_999, deadline)).toBe(false);
    expect(deadlineRemainingMs(startedAt, 12_000, deadline)).toBe(0);
    expect(isDeadlineReached(startedAt, 12_000, deadline)).toBe(true);
  });

  it('counts down a chosen deadline the same way', () => {
    const startedAt = 10_000;
    expect(deadlineRemainingMs(startedAt, 10_400, 1_000)).toBe(600);
    expect(isDeadlineReached(startedAt, 11_000, 1_000)).toBe(true);
    expect(isDeadlineReached(startedAt, 14_000, 5_000)).toBe(false);
  });

  it('offers the default among its choices and clamps anything else', () => {
    expect(SPEED_DEADLINE_OPTIONS_MS).toContain(DEFAULT_SPEED_DEADLINE_MS);
    expect(clampSpeedDeadlineMs(1_500)).toBe(1_500);
    expect(clampSpeedDeadlineMs(10)).toBe(1_000);
    expect(clampSpeedDeadlineMs(60_000)).toBe(5_000);
    expect(clampSpeedDeadlineMs(1_234.6)).toBe(1_235);
    expect(clampSpeedDeadlineMs(undefined)).toBe(DEFAULT_SPEED_DEADLINE_MS);
    expect(clampSpeedDeadlineMs(Number.NaN)).toBe(DEFAULT_SPEED_DEADLINE_MS);
  });
});
