import { describe, expect, it } from 'vitest';
import { deadlineRemainingMs, isDeadlineReached, SPEED_DEADLINE_MS } from '../training';

describe('speed timing contract', () => {
  it('keeps the product Speed deadline at exactly two seconds', () => {
    const startedAt = 10_000;
    expect(SPEED_DEADLINE_MS).toBe(2_000);
    expect(deadlineRemainingMs(startedAt, 11_999, SPEED_DEADLINE_MS)).toBe(1);
    expect(isDeadlineReached(startedAt, 11_999, SPEED_DEADLINE_MS)).toBe(false);
    expect(deadlineRemainingMs(startedAt, 12_000, SPEED_DEADLINE_MS)).toBe(0);
    expect(isDeadlineReached(startedAt, 12_000, SPEED_DEADLINE_MS)).toBe(true);
  });
});
