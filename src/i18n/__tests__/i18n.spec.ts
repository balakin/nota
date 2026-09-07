import { t } from '@lingui/core/macro';
import { afterEach, describe, expect, it } from 'vitest';

import { activateLocale, browserLocale, i18n } from '../i18n';

afterEach(() => {
  i18n.activate('en');
});

describe('i18n helpers', () => {
  it('falls back to English outside Russian browsers', () => {
    expect(browserLocale()).toBe('en');
  });

  it('translates macro messages from the compiled catalog', () => {
    activateLocale('ru');
    expect(t`Start training`).toBe('Начать тренировку');
  });
});
