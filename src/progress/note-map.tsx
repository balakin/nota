import { useLingui } from '@lingui/react/macro';

import type { AppSettings } from '../app-state/app-state';
import type { Clef } from '../music/music';
import { findRecognitionItem } from '../music/recognition-items';
import {
  accuracy,
  medianResponseTime,
  type NoteStats,
} from '../training/training';
import { NoteLabel } from '../ui/note-label';
import { formatResponse } from '../utils/format';

import { MASTERY_STATE_LABELS } from './mastery-labels';

function NoteTile({
  note,
  settings,
}: {
  note: NoteStats;
  settings: AppSettings;
}) {
  const { t } = useLingui();
  const item = findRecognitionItem(note.itemId);
  if (!item) return null;
  const state = t(MASTERY_STATE_LABELS[note.state]);
  const detail = note.totalAttempts
    ? `${Math.round(accuracy(note) * 100)}% ${t`correct`} · ${formatResponse(
        medianResponseTime(note),
        t`< 1s`,
        settings.locale === 'ru' ? ' с' : 's',
      )} ${t`per answer`}`
    : t`Not practiced yet`;
  return (
    <span
      className={`note-tile state-${note.state}`}
      title={`${state} · ${detail}`}
    >
      <NoteLabel
        value={item.pitch}
        naming={settings.naming}
        locale={settings.locale}
        octave
      />
      <span className="note-tile-detail">
        {note.totalAttempts ? `${Math.round(accuracy(note) * 100)}%` : '—'}
      </span>
    </span>
  );
}

/** One clef's curriculum in pitch order, so the row reads like the keyboard itself. */
function ClefRow({
  clef,
  notes,
  settings,
}: {
  clef: Clef;
  notes: NoteStats[];
  settings: AppSettings;
}) {
  const { t } = useLingui();
  const ordered = [...notes].sort((a, b) => {
    const left = findRecognitionItem(a.itemId)?.pitch.midi ?? 0;
    const right = findRecognitionItem(b.itemId)?.pitch.midi ?? 0;
    return left - right;
  });
  const practiced = ordered.filter((note) => note.totalAttempts > 0);
  const correct = ordered.reduce((sum, note) => sum + note.correctAttempts, 0);
  const attempts = ordered.reduce((sum, note) => sum + note.totalAttempts, 0);
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
          <NoteTile key={note.itemId} note={note} settings={settings} />
        ))}
      </div>
    </div>
  );
}

export function NoteMap({
  notes,
  settings,
}: {
  notes: NoteStats[];
  settings: AppSettings;
}) {
  return (
    <div className="note-map">
      <ClefRow
        clef="treble"
        notes={notes.filter((note) => note.clef === 'treble')}
        settings={settings}
      />
      <ClefRow
        clef="bass"
        notes={notes.filter((note) => note.clef === 'bass')}
        settings={settings}
      />
    </div>
  );
}
