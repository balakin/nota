import { useLingui } from '@lingui/react/macro';

import { RANGES, type RangeDays } from './dashboard-stats';

export function RangeBar({
  range,
  onChange,
}: {
  range: string;
  onChange: (id: string, days: RangeDays) => void;
}) {
  const { t } = useLingui();
  return (
    <div className="range-bar">
      <span className="range-bar-label">{t`Range`}</span>
      <div className="range-picker" role="group" aria-label={t`Range`}>
        {RANGES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === range ? 'is-selected' : ''}
            aria-pressed={option.id === range}
            onClick={() => {
              onChange(option.id, option.days);
            }}
          >
            {option.days === null ? t`All` : t`${option.days}d`}
          </button>
        ))}
      </div>
    </div>
  );
}
