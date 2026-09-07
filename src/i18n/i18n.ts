import { i18n } from '@lingui/core';

import type { Locale } from '../app-state/app-state';
import { messages as en } from '../locales/en.po';
import { messages as ru } from '../locales/ru.po';

export { i18n };

i18n.load({ en, ru });
i18n.activate('en');

export function activateLocale(locale: Locale): void {
  i18n.activate(locale);
}

export function browserLocale(): Locale {
  return typeof navigator !== 'undefined' &&
    navigator.language.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en';
}
