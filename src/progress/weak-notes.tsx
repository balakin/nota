import { useLingui } from '@lingui/react/macro';

import type { AppSettings } from '../app-state/app-state';
import { findRecognitionItem } from '../music/recognition-items';
import { accuracy, type NoteStats } from '../training/training';
import { NoteLabel } from '../ui/note-label';

export function WeakNotes({
  notes,
  settings,
}: {
  notes: NoteStats[];
  settings: AppSettings;
}) {
  const { t } = useLingui();
  if (!notes.length)
    return (
      <p className="muted-copy">{t`Practice a few notes and the shakiest ones will collect here.`}</p>
    );
  return (
    <ul className="weak-list">
      {notes.map((note) => {
        const item = findRecognitionItem(note.itemId);
        if (!item) return null;
        const percent = Math.round(accuracy(note) * 100);
        return (
          <li key={note.itemId}>
            <span className="weak-name">
              <NoteLabel
                value={item.pitch}
                naming={settings.naming}
                locale={settings.locale}
                octave
              />
            </span>
            <span className="weak-track">
              <span style={{ width: `${percent}%` }} />
            </span>
            <span className="weak-value">{percent}%</span>
          </li>
        );
      })}
    </ul>
  );
}
