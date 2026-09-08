import { useLingui } from '@lingui/react/macro';

import type { Locale } from '../app-state/app-state';
import { decimalMark } from '../i18n/i18n';
import type { PracticeMode } from '../training/training';
import { formatSeconds } from '../utils/format';

export function ModePicker({
  mode,
  speedDeadlineMs,
  locale,
  onChange,
}: {
  mode: PracticeMode;
  speedDeadlineMs: number;
  locale: Locale;
  onChange: (mode: PracticeMode) => void;
}) {
  const { t } = useLingui();
  const seconds = formatSeconds(speedDeadlineMs, decimalMark(locale));
  return (
    <div className="setting-row">
      <span className="setting-label">{t`Training mode`}</span>
      <div className="mode-grid">
        <button
          type="button"
          className={mode === 'practice' ? 'selected' : ''}
          aria-pressed={mode === 'practice'}
          onClick={() => onChange('practice')}
        >
          <strong>{t`Practice`}</strong>
          <small>{t`All the time you need, on every note`}</small>
        </button>
        <button
          type="button"
          className={mode === 'speed' ? 'selected' : ''}
          aria-pressed={mode === 'speed'}
          onClick={() => onChange('speed')}
        >
          <strong>{t`Speed`}</strong>
          <small>{t`${seconds}s per note, every note`}</small>
        </button>
      </div>
    </div>
  );
}
