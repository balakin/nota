import { i18n } from '@lingui/core';
import { en, ru } from './messages';
import type { Locale } from '../app/state';

export { i18n };

i18n.load({ en, ru });
i18n.activate('en');

export function activateLocale(locale: Locale): void {
  i18n.activate(locale);
}

export function browserLocale(): Locale {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en';
}

export function interpolate(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
