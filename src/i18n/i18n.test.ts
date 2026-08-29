import { describe, expect, it } from 'vitest';
import { browserLocale, interpolate } from './i18n';

describe('i18n helpers', () => {
  it('interpolates simple UI values', () => {
    expect(interpolate('Question {current} of {total}', { current: 2, total: 5 })).toBe(
      'Question 2 of 5',
    );
  });

  it('falls back to English outside Russian browsers', () => {
    expect(browserLocale()).toBe('en');
  });
});
