import { describe, expect, it } from 'vitest';

import { pageFromHash } from '../pages';

describe('hash routing', () => {
  it('reads a known page out of the hash', () => {
    expect(pageFromHash('#progress')).toBe('progress');
    expect(pageFromHash('research')).toBe('research');
  });

  it('falls back to training for unknown or empty hashes', () => {
    expect(pageFromHash('')).toBe('train');
    expect(pageFromHash('#nowhere')).toBe('train');
  });
});
