import { useLingui } from '@lingui/react/macro';

import type { AppSettings } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { findRecognitionItem } from '../music/recognition-items';
import { Icon } from '../ui/icon';

import type { LevelLesson, LevelStanding } from './lesson-state';
import { LevelNotes } from './level-notes';
import type { RunSummary as Summary } from './use-learning-run';

/**
 * The end of a run, not the end of a level. It has to show movement even when no note
 * finished — most runs end that way, by design — so the meter carries banked credits
 * behind the notes actually learned, and every note shows what it has.
 */
export function RunSummary({
  summary,
  standing,
  lesson,
  nextLevel,
  settings,
  onAgain,
  onNext,
  onDone,
}: {
  summary: Summary;
  standing: LevelStanding;
  lesson: LevelLesson | undefined;
  /** The level this one opens, when it has just been finished. */
  nextLevel: LevelStanding | null;
  settings: AppSettings;
  onAgain: () => void;
  onNext: () => void;
  onDone: () => void;
}) {
  const { t } = useLingui();
  const complete = standing.status === 'complete';
  const percent = (value: number, of: number) =>
    `${String(Math.round((value / Math.max(1, of)) * 100))}%`;
  const names = (ids: readonly string[]) =>
    ids.map((id) => {
      const item = findRecognitionItem(id);
      return item
        ? displayNoteName(item.pitch, settings.naming, settings.locale)
        : id;
    });

  return (
    <div className="page run-summary">
      <div className="result-header">
        <span className="result-icon">
          <Icon name={complete ? 'check' : 'arrow'} size={24} />
        </span>
        <div>
          <p className="eyebrow">{t(standing.level.title)}</p>
          <h1>{complete ? t`Level complete` : t`Run done`}</h1>
        </div>
      </div>
      <section className="surface result-detail">
        <div className="level-meter is-tall" aria-hidden="true">
          {/* Behind the notes finished, the credits banked towards the rest. */}
          <span
            className="level-meter-banked"
            style={{ width: percent(standing.earned, standing.required) }}
          />
          <span
            className="level-meter-fill"
            style={{ width: percent(standing.learned, standing.total) }}
          />
        </div>
        <p className="run-meter-line">
          <strong>
            {standing.learned}/{standing.total}
          </strong>{' '}
          {t`notes learned`}
          {complete ? null : (
            <>
              {' · '}
              <span className="run-banked">
                {t`${percent(standing.earned, standing.required)} done`}
              </span>
            </>
          )}
        </p>
        <LevelNotes
          level={standing.level}
          lesson={lesson}
          settings={settings}
        />
        {summary.credited.length > 0 ? (
          <p className="run-moved">
            <Icon name="check" size={14} />{' '}
            {t`Moved forward: ${names(summary.credited).join(', ')}`}
          </p>
        ) : null}
        {summary.lapsed.length > 0 ? (
          <p className="run-moved is-back">
            <Icon name="arrow" size={14} />{' '}
            {t`Back to repair: ${names(summary.lapsed).join(', ')}`}
          </p>
        ) : null}
        <p className="muted-copy">
          {complete
            ? t`Every note here has come back correctly in enough separate runs to count as learned. You can still run it to sharpen it.`
            : t`A note is learned once it comes back correctly in several separate runs. Coming back is what makes it stick — a single long sitting does not.`}
        </p>
        <div className="run-actions">
          {complete && nextLevel ? (
            <button
              className="button button-primary"
              type="button"
              onClick={onNext}
            >
              <Icon name="play" size={17} />{' '}
              {t`Next: ${t(nextLevel.level.title)}`}
            </button>
          ) : (
            <button
              className="button button-primary"
              type="button"
              onClick={onAgain}
            >
              <Icon name="play" size={17} />{' '}
              {complete ? t`Run it again` : t`Start next run`}
            </button>
          )}
          <button className="button" type="button" onClick={onDone}>
            {t`Back to levels`}
          </button>
        </div>
      </section>
    </div>
  );
}
