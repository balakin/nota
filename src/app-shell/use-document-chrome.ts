import { useEffect } from 'react';

import type { AppSettings } from '../app-state/app-state';
import { activateLocale } from '../i18n/i18n';

/** Keeps the document itself — catalog, `lang`, title and theme — in step with settings. */
export function useDocumentChrome({
  locale,
  theme,
}: Pick<AppSettings, 'locale' | 'theme'>): void {
  useEffect(() => {
    activateLocale(locale);
    document.documentElement.lang = locale;
    document.title =
      locale === 'ru'
        ? 'Nota — Распознавание нот'
        : 'Nota — Musical note recognition';
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [locale, theme]);
}
