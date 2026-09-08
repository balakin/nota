import { useLingui } from '@lingui/react/macro';

import type { AppSettings } from '../app-state/app-state';
import { NoteLabel } from '../ui/note-label';

import { noteLessonOf, phaseOf, type LevelLesson } from './lesson-state';
import type { Level } from './levels';
import { isPivot } from './pivots';

/**
 * Every note of a level with the credits it has banked. The pips are what make a run
 * visible: a note needs several credits before it counts as learned, so without them a
 * good first run would show nothing but a zero.
 */
export function LevelNotes({
  level,
  lesson,
  settings,
}: {
  level: Level;
  lesson: LevelLesson | undefined;
  settings: AppSettings;
}) {
  const { t } = useLingui();
  return (
    <ul className="level-notes">
      {level.items.map((item) => {
        const note = noteLessonOf(lesson, item.id);
        const banked = Math.min(level.credits, note.credits);
        return (
          <li
            key={item.id}
            className={`phase-${phaseOf(note, level)} ${isPivot(item) ? 'is-anchor' : ''}`}
            title={
              isPivot(item)
                ? t`Anchor note · ${banked} of ${level.credits} runs`
                : t`${banked} of ${level.credits} runs`
            }
          >
            <NoteLabel
              value={item.pitch}
              naming={settings.naming}
              locale={settings.locale}
              octave
            />
            <span className="note-pips" aria-hidden="true">
              {Array.from({ length: level.credits }, (_, index) => (
                <span key={index} className={index < banked ? 'is-full' : ''} />
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
