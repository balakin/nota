import { useLingui } from '@lingui/react/macro';
import type { AppSettings } from '../app-state/app-state';
import { Icon } from '../ui/icon';
import { NamingChoice } from './naming-choice';

export function OnboardingPage({
  settings,
  onChange,
  onComplete,
}: {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onComplete: () => void;
}) {
  const { t } = useLingui();
  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="brand lockup">
          <span className="brand-mark">
            <Icon name="note" size={22} />
          </span>
          <span>Nota</span>
        </div>
        <p className="eyebrow">{t`A calm practice for your eyes`}</p>
        <h1>{t`Don’t count. Recognize.`}</h1>
        <p className="lead">
          {t`Build a direct connection between the note on the staff and its place on the piano. Start with a few landmarks, then let accuracy become speed.`}
        </p>
        <fieldset className="onboarding-choice">
          <legend>{t`How should note names appear?`}</legend>
          <NamingChoice
            selected={settings.naming === 'letters'}
            onClick={() => onChange({ naming: 'letters' })}
            title={t`Letters`}
            example={t`C · D · E · F · G · A · B`}
          />
          <NamingChoice
            selected={settings.naming === 'solfege'}
            onClick={() => onChange({ naming: 'solfege' })}
            title={t`Fixed solfège`}
            example={t`Do · Re · Mi · Fa · Sol · La · Si`}
          />
        </fieldset>
        <button className="button button-primary button-large" type="button" onClick={onComplete}>
          {t`Start training`} <Icon name="arrow" size={18} />
        </button>
        <p className="fine-print">
          {t`Nota is a small, local-first tool. Your progress stays on this device.`}
        </p>
      </div>
    </div>
  );
}
