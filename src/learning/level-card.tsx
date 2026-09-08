import { useLingui } from '@lingui/react/macro';
import type { ReactNode } from 'react';

import type { AppSettings } from '../app-state/app-state';
import type { NoteStats } from '../training/training';
import { Icon } from '../ui/icon';
import { NoteLabel } from '../ui/note-label';

import { isLearned, type LevelProgress } from './level-progress';

/**
 * One rung of the ladder. A locked level still shows what it holds — the path is worth
 * seeing ahead — but only an open level can be started.
 */
export function LevelCard({
  progress,
  index,
  open,
  learningNotes,
  settings,
  onOpen,
  onStart,
  children,
}: {
  progress: LevelProgress;
  index: number;
  open: boolean;
  learningNotes: Readonly<Record<string, NoteStats>>;
  settings: AppSettings;
  onOpen: () => void;
  onStart: () => void;
  /** The setup controls, rendered only inside the opened card. */
  children: ReactNode;
}) {
  const { t } = useLingui();
  const { level, status, learned, total } = progress;
  const locked = status === 'locked';
  const previous = String(index);
  const statusLabel =
    status === 'complete'
      ? t`Complete`
      : locked
        ? t`Finish level ${previous}`
        : t`In progress`;

  return (
    <li className={`level-card status-${status} ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="level-head"
        disabled={locked}
        aria-expanded={open}
        onClick={onOpen}
      >
        <span className="level-index" aria-hidden="true">
          {status === 'complete' ? <Icon name="check" size={16} /> : index + 1}
        </span>
        <span className="level-heading">
          <strong>{t(level.title)}</strong>
          <small>{t(level.goal)}</small>
        </span>
        <span className="level-status">
          {locked ? <Icon name="lock" size={13} /> : null}
          {statusLabel}
        </span>
      </button>
      <div className="level-meter" aria-hidden="true">
        <span
          className="level-meter-fill"
          style={{ width: `${String(Math.round((learned / total) * 100))}%` }}
        />
      </div>
      <p className="level-count">{t`${learned} of ${total} notes learned`}</p>
      {open ? (
        <div className="level-body">
          <ul className="level-notes">
            {level.items.map((item) => (
              <li
                key={item.id}
                className={
                  isLearned(learningNotes[item.id]) ? 'is-learned' : ''
                }
              >
                <NoteLabel
                  value={item.pitch}
                  naming={settings.naming}
                  locale={settings.locale}
                  octave
                />
              </li>
            ))}
          </ul>
          <div className="level-setup">
            {children}
            <button
              className="button button-primary button-large start-button"
              type="button"
              onClick={onStart}
            >
              <Icon name="play" size={18} />{' '}
              {status === 'complete' ? t`Practice again` : t`Start level`}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
