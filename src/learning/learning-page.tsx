import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

import type { PersistedState } from '../app-state/app-state';
import { MidiStatus } from '../practice/midi-status';
import { PracticeSession } from '../practice/practice-session';
import { ResultPage } from '../practice/result-page';
import { SESSION_DURATIONS } from '../practice/session';
import type { PracticeSessionController } from '../practice/use-practice-session';
import { TogglePicker } from '../ui/toggle-picker';

import { LevelCard } from './level-card';
import {
  currentLevel,
  levelProgress,
  pathTotals,
  type LevelProgress,
} from './level-progress';

/** The card the page opens on: whichever level the path is waiting for. */
function defaultOpenId(progress: readonly LevelProgress[]): string | null {
  const current = currentLevel(progress);
  if (current) return current.level.id;
  const last = progress[progress.length - 1];
  return last ? last.level.id : null;
}

export function LearningPage({
  practice,
  state,
}: {
  practice: PracticeSessionController;
  state: PersistedState;
}) {
  const { t } = useLingui();
  const learningNotes = state.learning.notes;
  const progress = useMemo(() => levelProgress(learningNotes), [learningNotes]);
  const totals = pathTotals(progress);
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = openId ?? defaultOpenId(progress);

  if (practice.session?.track === 'learning')
    return (
      <PracticeSession
        session={practice.session}
        feedback={practice.feedback}
        settings={state.settings}
        midi={practice.midi}
        onAnswer={practice.answer}
        onPause={practice.togglePause}
        onFinish={practice.finish}
      />
    );
  if (practice.result?.track === 'learning')
    return (
      <ResultPage
        result={practice.result}
        settings={state.settings}
        onDone={practice.dismissResult}
      />
    );

  return (
    <div className="page learning-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t`One clef and one octave at a time.`}</p>
          <h1>{t`Learning path`}</h1>
          <p className="subheading">{t`Levels open in order: a level is finished when every note in it is recognized here, on the path. Train stays free — nothing you do there opens a level.`}</p>
        </div>
        <div className="path-total">
          <strong>
            {totals.learned}/{totals.total}
          </strong>
          <small>{t`notes learned`}</small>
        </div>
      </div>
      <ol className="level-list">
        {progress.map((entry, index) => (
          <LevelCard
            key={entry.level.id}
            progress={entry}
            index={index}
            open={entry.level.id === shown && entry.status !== 'locked'}
            learningNotes={learningNotes}
            settings={state.settings}
            onOpen={() =>
              setOpenId(entry.level.id === shown ? null : entry.level.id)
            }
            onStart={() =>
              practice.startLevel(entry.level.id, entry.level.items)
            }
          >
            <TogglePicker
              label={t`Answer with`}
              options={
                [
                  ['piano', t`Piano`],
                  ['names', t`Note names`],
                  ['midi', t`MIDI keyboard`],
                ] as const
              }
              value={practice.input}
              onChange={practice.setInput}
            />
            {practice.input === 'midi' ? (
              <MidiStatus midi={practice.midi} />
            ) : null}
            <div className="setting-row">
              <span className="setting-label">{t`Session length`}</span>
              <div className="segmented">
                {SESSION_DURATIONS.map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    className={
                      practice.durationMinutes === minutes ? 'selected' : ''
                    }
                    aria-pressed={practice.durationMinutes === minutes}
                    onClick={() => practice.setDurationMinutes(minutes)}
                  >
                    {t`${minutes} min`}
                  </button>
                ))}
              </div>
            </div>
          </LevelCard>
        ))}
      </ol>
    </div>
  );
}
