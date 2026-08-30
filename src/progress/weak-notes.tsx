import { useLingui } from '@lingui/react/macro';
import type { AppSettings } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { findRecognitionItem } from '../music/recognition-items';
import { accuracy, type NoteStats } from '../training/training';
import { Icon } from '../ui/icon';

export function WeakNotes({ notes, settings }: { notes: NoteStats[]; settings: AppSettings }) {
  const { t } = useLingui();
  if (!notes.length)
    return <p className="muted-copy">{t`Your note map will fill in as you practice.`}</p>;
  return (
    <div className="weak-list">
      {notes.map((note) => {
        const item = findRecognitionItem(note.itemId);
        return item ? (
          <span key={note.itemId}>
            <Icon name="arrow" size={14} />{' '}
            {displayNoteName(item.pitch, settings.naming, settings.locale)}
            {item.pitch.octave} <small>{Math.round(accuracy(note) * 100)}%</small>
          </span>
        ) : null;
      })}
    </div>
  );
}
