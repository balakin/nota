import { useLingui } from '@lingui/react/macro';
import type { AppSettings } from '../app-state/app-state';
import type { Page } from '../router/pages';
import { Icon } from '../ui/icon';
import { SettingSection } from './setting-section';

export function SettingsPage({
  settings,
  onChange,
  navigate,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  navigate: (page: Page) => void;
}) {
  const { t } = useLingui();
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t`Make Nota fit the way you learn.`}</p>
          <h1>{t`Settings`}</h1>
        </div>
      </div>
      <div className="settings-list">
        <SettingSection title={t`Interface language`}>
          <div className="segmented wide" role="group" aria-label={t`Choose interface language`}>
            <button
              type="button"
              className={settings.locale === 'en' ? 'selected' : ''}
              aria-pressed={settings.locale === 'en'}
              onClick={() => onChange({ locale: 'en' })}
            >
              English
            </button>
            <button
              type="button"
              className={settings.locale === 'ru' ? 'selected' : ''}
              aria-pressed={settings.locale === 'ru'}
              onClick={() => onChange({ locale: 'ru' })}
            >
              Русский
            </button>
          </div>
        </SettingSection>
        <SettingSection title={t`Note naming`}>
          <div className="segmented wide" role="group" aria-label={t`Choose note naming system`}>
            <button
              type="button"
              className={settings.naming === 'letters' ? 'selected' : ''}
              aria-pressed={settings.naming === 'letters'}
              onClick={() => onChange({ naming: 'letters' })}
            >
              C D E F G A B
            </button>
            <button
              type="button"
              className={settings.naming === 'solfege' ? 'selected' : ''}
              aria-pressed={settings.naming === 'solfege'}
              onClick={() => onChange({ naming: 'solfege' })}
            >
              Do Re Mi Fa Sol La Si
            </button>
          </div>
          <p className="setting-hint">{t`This changes labels, never your progress.`}</p>
        </SettingSection>
        <SettingSection title={t`Appearance`}>
          <div className="segmented wide" role="group" aria-label={t`Choose color theme`}>
            <button
              type="button"
              className={settings.theme === 'system' ? 'selected' : ''}
              aria-pressed={settings.theme === 'system'}
              onClick={() => onChange({ theme: 'system' })}
            >
              {t`System`}
            </button>
            <button
              type="button"
              className={settings.theme === 'light' ? 'selected' : ''}
              aria-pressed={settings.theme === 'light'}
              onClick={() => onChange({ theme: 'light' })}
            >
              {t`Light`}
            </button>
            <button
              type="button"
              className={settings.theme === 'dark' ? 'selected' : ''}
              aria-pressed={settings.theme === 'dark'}
              onClick={() => onChange({ theme: 'dark' })}
            >
              {t`Dark`}
            </button>
          </div>
        </SettingSection>
        <SettingSection title={t`Research behind Nota`}>
          <p className="setting-hint">
            {t`Why Nota uses visual retrieval, timing, and spaced review.`}
          </p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => navigate('research')}
          >
            {t`Read the research`} <Icon name="arrow" size={16} />
          </button>
        </SettingSection>
        <p className="about-copy">
          {t`Nota is a small, local-first tool. Your progress stays on this device.`}
        </p>
      </div>
    </div>
  );
}
