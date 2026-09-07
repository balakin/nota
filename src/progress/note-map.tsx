import { useLingui } from '@lingui/react/macro';

import type { AppSettings } from '../app-state/app-state';
import type { Clef } from '../music/music';
import { findRecognitionItem } from '../music/recognition-items';
import { accuracyOf, quantileMs, type Totals } from '../training/rollups';
import type { NoteStats } from '../training/training';
import { NoteLabel } from '../ui/note-label';
import { formatResponse } from '../utils/format';

import { MASTERY_STATE_LABELS } from './mastery-labels';

function NoteTile({
  note,
  totals,
  lastSeen,
  settings,
}: {
  note: NoteStats;
  totals: Totals | undefined;
  lastSeen: string | undefined;
  settings: AppSettings;
}) {
  const { t } = useLingui();
  const item = findRecognitionItem(note.itemId);
  if (!item) return null;
  const state = t(MASTERY_STATE_LABELS[note.state]);
  const attempts = totals?.attempts ?? 0;
  const detail = attempts
    ? `${Math.round(accuracyOf(totals!) * 100)}% ${t`correct`} · ${formatResponse(
        quantileMs(totals!),
        t`< 1s`,
        settings.locale === 'ru' ? ' с' : 's',
      )} ${t`per answer`} · ${String(attempts)} ${t`notes`}`
    : lastSeen
      ? `${t`Not in this range`} · ${t`last seen`} ${lastSeen}`
      : t`Not practiced yet`;
  return (
    <span
      className={`note-tile state-${note.state} ${attempts ? '' : 'is-idle'}`}
      title={`${state} · ${detail}`}
    >
      <NoteLabel
        value={item.pitch}
        naming={settings.naming}
        locale={settings.locale}
        octave
      />
      <span className="note-tile-detail">
        {attempts ? `${Math.round(accuracyOf(totals!) * 100)}%` : '—'}
      </span>
    </span>
  );
}

/** One clef's curriculum in pitch order, so the row reads like the keyboard itself. */
function ClefRow({
  clef,
  notes,
  byItem,
  lastSeenByItem,
  settings,
}: {
  clef: Clef;
  notes: NoteStats[];
  byItem: Record<string, Totals>;
  lastSeenByItem: Record<string, string>;
  settings: AppSettings;
}) {
  const { t } = useLingui();
  const ordered = [...notes].sort((a, b) => {
    const left = findRecognitionItem(a.itemId)?.pitch.midi ?? 0;
    const right = findRecognitionItem(b.itemId)?.pitch.midi ?? 0;
    return left - right;
  });
  const practiced = ordered.filter(
    (note) => (byItem[note.itemId]?.attempts ?? 0) > 0,
  );
  const correct = ordered.reduce(
    (sum, note) => sum + (byItem[note.itemId]?.correct ?? 0),
    0,
  );
  const attempts = ordered.reduce(
    (sum, note) => sum + (byItem[note.itemId]?.attempts ?? 0),
    0,
  );
  return (
    <div className="clef-row">
      <div className="clef-row-head">
        <strong>{clef === 'treble' ? t`Treble` : t`Bass`}</strong>
        <span
          className="clef-row-stat"
          title={t`Notes met, and correct answers across this clef`}
        >
          {practiced.length}/{ordered.length}
          {attempts
            ? ` · ${Math.round((correct / attempts) * 100)}%`
            : ` · ${t`New`}`}
        </span>
      </div>
      <div className="note-tiles">
        {ordered.map((note) => (
          <NoteTile
            key={note.itemId}
            note={note}
            totals={byItem[note.itemId]}
            lastSeen={lastSeenByItem[note.itemId]}
            settings={settings}
          />
        ))}
      </div>
    </div>
  );
}

export function NoteMap({
  notes,
  byItem,
  lastSeenByItem,
  settings,
}: {
  notes: NoteStats[];
  byItem: Record<string, Totals>;
  lastSeenByItem: Record<string, string>;
  settings: AppSettings;
}) {
  return (
    <div className="note-map">
      {(['treble', 'bass'] as const).map((clef) => (
        <ClefRow
          key={clef}
          clef={clef}
          notes={notes.filter((note) => note.clef === clef)}
          byItem={byItem}
          lastSeenByItem={lastSeenByItem}
          settings={settings}
        />
      ))}
    </div>
  );
}
