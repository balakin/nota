import { useLingui } from '@lingui/react/macro';

/**
 * A scalar with its movement against the preceding window of the same length. Direction
 * is given explicitly because for response time a fall is the good news.
 */
export function StatTile({
  label,
  value,
  delta,
  unit,
  lowerIsBetter = false,
  comparable = true,
}: {
  label: string;
  value: string;
  delta: number | null;
  unit?: string;
  lowerIsBetter?: boolean;
  /** False over all time, where there is no preceding window to compare against. */
  comparable?: boolean;
}) {
  const { t } = useLingui();
  const moved = delta !== null && Math.abs(delta) >= 0.05;
  const better = delta !== null && (lowerIsBetter ? delta < 0 : delta > 0);
  const rounded =
    delta === null
      ? ''
      : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(unit === 's' ? 1 : 0)}`;
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {!comparable ? (
        <span className="stat-delta is-flat">{t`no earlier window`}</span>
      ) : delta === null ? (
        <span className="stat-delta is-flat" aria-hidden="true">
          &nbsp;
        </span>
      ) : moved ? (
        <span className={`stat-delta ${better ? 'is-better' : 'is-worse'}`}>
          {rounded}
          {unit ?? ''} {t`vs previous`}
        </span>
      ) : (
        <span className="stat-delta is-flat">{t`level with previous`}</span>
      )}
    </div>
  );
}
