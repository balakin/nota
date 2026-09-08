import { useLingui } from '@lingui/react/macro';

import type { Locale } from '../app-state/app-state';
import { decimalMark } from '../i18n/i18n';
import { SPEED_DEADLINE_OPTIONS_MS } from '../training/training';
import { formatSeconds } from '../utils/format';

export function SpeedDeadlinePicker({
  deadlineMs,
  locale,
  onChange,
}: {
  deadlineMs: number;
  locale: Locale;
  onChange: (ms: number) => void;
}) {
  const { t } = useLingui();
  const mark = decimalMark(locale);
  return (
    <div className="setting-row">
      <span className="setting-label">{t`Time per note`}</span>
      <div className="segmented" role="group" aria-label={t`Time per note`}>
        {SPEED_DEADLINE_OPTIONS_MS.map((ms) => {
          const seconds = formatSeconds(ms, mark);
          return (
            <button
              type="button"
              key={ms}
              className={deadlineMs === ms ? 'selected' : ''}
              aria-pressed={deadlineMs === ms}
              onClick={() => onChange(ms)}
            >
              {t`${seconds}s`}
            </button>
          );
        })}
      </div>
      <p className="setting-hint">{t`Speed mode ends a note when this runs out. Two seconds is the default.`}</p>
    </div>
  );
}
