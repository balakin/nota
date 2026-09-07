import { useLingui } from '@lingui/react/macro';

import type { AppSettings, SessionSummary } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { findRecognitionItem } from '../music/recognition-items';
import { Icon } from '../ui/icon';
import { Metric } from '../ui/metric';
import { formatDuration, formatResponse } from '../utils/format';

export function ResultPage({
  result,
  settings,
  onDone,
}: {
  result: SessionSummary;
  settings: AppSettings;
  onDone: () => void;
}) {
  const { t } = useLingui();
  const names = (ids: string[]) =>
    ids.map((id) => {
      const item = findRecognitionItem(id);
      return item
        ? displayNoteName(item.pitch, settings.naming, settings.locale)
        : id;
    });
  return (
    <div className="page result-page">
      <div className="result-header">
        <span className="result-icon">
          <Icon name="check" size={24} />
        </span>
        <div>
          <p className="eyebrow">{t`A small, useful block of practice.`}</p>
          <h1>{t`Session complete`}</h1>
        </div>
      </div>
      <div className="result-metrics">
        <Metric label={t`Notes attempted`} value={result.attempts} />
        <Metric
          label={t`Accuracy`}
          value={`${result.attempts ? Math.round((result.correct / result.attempts) * 100) : 0}%`}
        />
        <Metric
          label={t`Median response`}
          value={formatResponse(
            result.medianResponseMs,
            t`< 1s`,
            settings.locale === 'ru' ? ' с' : 's',
          )}
        />
        <Metric label={t`Timeouts`} value={result.timeouts} />
      </div>
      <div className="result-columns">
        <section className="surface result-detail">
          <h2>{t`New progress`}</h2>
          {result.newRecognized.length + result.newFluent.length > 0 ? (
            <div className="result-tags">
              {[...names(result.newRecognized), ...names(result.newFluent)].map(
                (name) => (
                  <span className="tag" key={name}>
                    {name}
                  </span>
                ),
              )}
            </div>
          ) : (
            <p className="muted-copy">{t`Keep going — your next recognition is forming.`}</p>
          )}
          <h2>{t`Worth another look`}</h2>
          {result.weakestItemIds.length > 0 ? (
            <div className="weak-list">
              {names(result.weakestItemIds).map((name) => (
                <span key={name}>
                  <Icon name="arrow" size={14} /> {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted-copy">{t`Your note map will fill in as you practice.`}</p>
          )}
        </section>
        <section className="surface result-detail">
          <h2>{t`Practice time`}</h2>
          <strong className="big-number">
            {formatDuration(result.practiceSeconds)}
          </strong>
          <p className="muted-copy">
            {result.mode === 'speed'
              ? t`2 seconds per note · piano labels hidden`
              : t`Generous time while you build accuracy`}
          </p>
          <button
            className="button button-primary"
            type="button"
            onClick={onDone}
          >
            {t`Back to training`} <Icon name="arrow" size={17} />
          </button>
        </section>
      </div>
    </div>
  );
}
