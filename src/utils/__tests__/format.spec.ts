import { describe, expect, it } from 'vitest';

import { formatDuration, formatResponse } from '../format';

describe('display formatting', () => {
  it('formats practice time as minutes and padded seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('formats response times, collapsing sub-second answers', () => {
    expect(formatResponse(null)).toBe('—');
    expect(formatResponse(999)).toBe('< 1s');
    expect(formatResponse(1460)).toBe('1.5s');
    expect(formatResponse(1460, '< 1 с', ' с')).toBe('1.5 с');
  });
});
