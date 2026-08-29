import { useLingui } from '@lingui/react';

export function useTranslation() {
  const { i18n } = useLingui();
  return (id: string, message: string, values?: Record<string, string | number>): string => {
    const translated = i18n._({ id, message });
    return values
      ? translated.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
      : translated;
  };
}
