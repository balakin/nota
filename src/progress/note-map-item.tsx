import { useLingui } from '@lingui/react/macro';
import type { AppSettings } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { findRecognitionItem } from '../music/recognition-items';
import { accuracy, medianResponseTime, type NoteStats } from '../training/training';
import { formatResponse } from '../utils/format';
import { MASTERY_STATE_LABELS } from './mastery-labels';

export function NoteMapItem({ note, settings }: { note: NoteStats; settings: AppSettings }) {
  const { t } = useLingui();
  const item = findRecognitionItem(note.itemId);
  if (!item) return null;
  const name = displayNoteName(item.pitch, settings.naming, settings.locale);
  return (
    <div className={`note-map-item state-${note.state}`}>
      <span className={`mini-clef ${item.clef}`}>{item.clef === 'treble' ? '𝄞' : '𝄢'}</span>
      <span className="note-map-name">
        <strong>
          {name}
          {settings.naming === 'letters' ? item.pitch.octave : ''}
        </strong>
        <small>{t(MASTERY_STATE_LABELS[note.state])}</small>
      </span>
      <span className="note-map-stat">
        {note.totalAttempts
          ? `${Math.round(accuracy(note) * 100)}% · ${formatResponse(medianResponseTime(note), t`< 1s`, settings.locale === 'ru' ? ' с' : 's')}`
          : '—'}
      </span>
    </div>
  );
}
