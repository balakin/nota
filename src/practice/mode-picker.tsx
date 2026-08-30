import { useLingui } from '@lingui/react/macro';
import type { PracticeMode } from '../training/training';

export function ModePicker({
  mode,
  onChange,
}: {
  mode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}) {
  const { t } = useLingui();
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
          <small>{t`Generous time while you build accuracy`}</small>
        </button>
        <button
          type="button"
          className={mode === 'speed' ? 'selected' : ''}
          aria-pressed={mode === 'speed'}
          onClick={() => onChange('speed')}
        >
          <strong>{t`Speed`}</strong>
          <small>{t`2 seconds per note · piano labels hidden`}</small>
        </button>
      </div>
    </div>
  );
}
