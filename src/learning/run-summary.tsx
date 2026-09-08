import { useLingui } from '@lingui/react/macro';

import type { AppSettings } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { findRecognitionItem } from '../music/recognition-items';
import { Icon } from '../ui/icon';

import type { LevelStanding } from './lesson-state';
import type { RunSummary as Summary } from './use-learning-run';

/**
 * The end of a run, not the end of a level. It says what moved and what is still owed,
 * because the next press of Start is the point — a level is meant to take several.
 */
export function RunSummary({
  summary,
  standing,
  settings,
  onAgain,
  onDone,
}: {
  summary: Summary;
  standing: LevelStanding;
  settings: AppSettings;
  onAgain: () => void;
  onDone: () => void;
}) {
  const { t } = useLingui();
  const complete = standing.status === 'complete';
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
        <p className="run-meter-line">
          <strong>
            {standing.learned}/{standing.total}
          </strong>{' '}
          {t`notes learned`}
        </p>
        <div className="level-meter" aria-hidden="true">
          <span
            className="level-meter-fill"
            style={{
              width: `${String(Math.round((standing.learned / standing.total) * 100))}%`,
            }}
          />
        </div>
        {summary.credited.length > 0 ? (
          <>
            <h2>{t`Moved forward`}</h2>
            <div className="result-tags">
              {names(summary.credited).map((name) => (
                <span className="tag" key={name}>
                  {name}
                </span>
              ))}
            </div>
          </>
        ) : null}
        {summary.lapsed.length > 0 ? (
          <>
            <h2>{t`Back to repair`}</h2>
            <div className="weak-list">
              {names(summary.lapsed).map((name) => (
                <span key={name}>
                  <Icon name="arrow" size={14} /> {name}
                </span>
              ))}
            </div>
          </>
        ) : null}
        <p className="muted-copy">
          {complete
            ? t`Every note in this level has been recalled in enough separate runs to count as learned. You can still run it to sharpen it.`
            : t`A note counts as learned after it comes back correctly in several separate runs. Coming back is what makes it stick — a single long sitting does not.`}
        </p>
        <div className="run-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={onAgain}
          >
            <Icon name="play" size={17} /> {t`Run again`}
          </button>
          <button className="button" type="button" onClick={onDone}>
            {t`Back to the path`}
          </button>
        </div>
      </section>
    </div>
  );
}
