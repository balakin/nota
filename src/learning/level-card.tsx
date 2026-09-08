import { useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';

import type { AppSettings } from '../app-state/app-state';
import { Icon } from '../ui/icon';
import { NoteLabel } from '../ui/note-label';

import {
  noteLessonOf,
  phaseOf,
  type LevelLesson,
  type LevelStanding,
} from './lesson-state';
import { isPivot } from './pivots';
import { runOutline } from './run-plan';

/**
 * One rung. It shows the level's contract — every note and where it stands — because
 * Start is pressed many times and the learner should know what the next press holds.
 */
export function LevelCard({
  standing,
  lesson,
  open,
  settings,
  onOpen,
  onStart,
  children,
}: {
  standing: LevelStanding;
  lesson: LevelLesson | undefined;
  open: boolean;
  settings: AppSettings;
  onOpen: () => void;
  onStart: () => void;
  /** The input picker, rendered inside the opened card. */
  children: ReactNode;
}) {
  const { t } = useLingui();
  const { level, status, learned, total } = standing;
  const locked = status === 'locked';
  const outline = runOutline(level, lesson);
  const nextRun = locked
    ? null
    : outline.complete
      ? t`Polish run — every note, on the clock`
      : [
          outline.introduce > 0 ? t`meet ${outline.introduce} new` : null,
          outline.repair > 0 ? t`repair ${outline.repair}` : null,
          outline.consolidate > 0 ? t`practise ${outline.consolidate}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <li
      className={`level-card status-${status} kind-${level.kind} ${open ? 'is-open' : ''}`}
    >
      <button
        type="button"
        className="level-head"
        disabled={locked}
        aria-expanded={open}
        onClick={onOpen}
      >
        <span className="level-mark" aria-hidden="true">
          {status === 'complete' ? (
            <Icon name="check" size={15} />
          ) : locked ? (
            <Icon name="lock" size={14} />
          ) : (
            <Icon name={level.kind === 'mixed' ? 'chart' : 'book'} size={15} />
          )}
        </span>
        <span className="level-heading">
          <strong>{t(level.title)}</strong>
          <small>{t(level.goal)}</small>
        </span>
        <span className="level-tally">
          {learned}/{total}
        </span>
      </button>
      <div className="level-meter" aria-hidden="true">
        <span
          className="level-meter-fill"
          style={{ width: `${String(Math.round((learned / total) * 100))}%` }}
        />
      </div>
      {open ? (
        <div className="level-body">
          <ul className="level-notes">
            {level.items.map((item) => {
              const note = noteLessonOf(lesson, item.id);
              return (
                <li
                  key={item.id}
                  className={`phase-${phaseOf(note, level)} ${isPivot(item) ? 'is-anchor' : ''}`}
                  title={
                    isPivot(item)
                      ? t`Anchor note · ${note.credits} of ${level.credits} runs`
                      : t`${note.credits} of ${level.credits} runs`
                  }
                >
                  <NoteLabel
                    value={item.pitch}
                    naming={settings.naming}
                    locale={settings.locale}
                    octave
                  />
                </li>
              );
            })}
          </ul>
          {children}
          <button
            className="button button-primary button-large start-button"
            type="button"
            onClick={onStart}
          >
            <Icon name="play" size={18} />{' '}
            {standing.runs === 0 ? t`Start` : t`Start run ${standing.runs + 1}`}
          </button>
          {nextRun ? <p className="next-run">{nextRun}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
