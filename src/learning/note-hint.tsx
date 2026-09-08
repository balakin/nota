import { useLingui } from '@lingui/react/macro';

import type { Locale } from '../app-state/app-state';
import {
  displayNoteName,
  type NamingSystem,
  type RecognitionItem,
} from '../music/music';

import { bearingOf, isPivot, PIVOT_REASONS } from './pivots';

/**
 * The hint ladder. Rung one reads the note against the nearest landmark, which is how a
 * beginner gets from nothing to something; rung two simply names it. Both are scaffolding
 * — the check questions run on a clock precisely so counting from a landmark stops paying.
 */
export function NoteHint({
  item,
  depth,
  naming,
  locale,
}: {
  item: RecognitionItem;
  depth: number;
  naming: NamingSystem;
  locale: Locale;
}) {
  const { t } = useLingui();
  if (depth < 1) return null;

  const name = displayNoteName(item.pitch, naming, locale);
  if (depth > 1)
    return (
      <p className="note-hint is-answer">
        {t`It is`} <strong>{name}</strong>
      </p>
    );

  const bearing = bearingOf(item);
  const place = bearing.onLine ? t`on a line` : t`in a space`;
  const outside =
    bearing.ledger > 0
      ? bearing.ledger === 1
        ? t`on a short line outside the staff`
        : t`outside the staff`
      : null;

  if (isPivot(item)) {
    const reason = PIVOT_REASONS[item.id];
    return (
      <p className="note-hint">
        <strong>{t`An anchor`}</strong>
        {' — '}
        {reason ? t(reason) : (outside ?? place)}
      </p>
    );
  }

  if (!bearing.pivot) return <p className="note-hint">{outside ?? place}</p>;

  const anchor = displayNoteName(bearing.pivot.pitch, naming, locale);
  const steps = Math.abs(bearing.steps);
  const distance =
    steps === 1
      ? t`One step`
      : steps === 2
        ? t`Two steps`
        : steps === 3
          ? t`Three steps`
          : t`${steps} steps`;
  return (
    <p className="note-hint">
      {bearing.steps > 0
        ? t`${distance} above ${anchor}`
        : t`${distance} below ${anchor}`}
      {' · '}
      {outside ?? place}
    </p>
  );
}
