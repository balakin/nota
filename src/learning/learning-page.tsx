import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

import type { PersistedState } from '../app-state/app-state';
import { MidiStatus } from '../practice/midi-status';
import { TogglePicker } from '../ui/toggle-picker';

import { LearningRun } from './learning-run';
import {
  currentStanding,
  pathTotals,
  sectionStandings,
  type LevelStanding,
} from './lesson-state';
import { LevelCard } from './level-card';
import { retentionPool } from './run-plan';
import { RunSummary } from './run-summary';
import type { LearningRunController } from './use-learning-run';

export function LearningPage({
  controller,
  state,
}: {
  controller: LearningRunController;
  state: PersistedState;
}) {
  const { t } = useLingui();
  const levels = state.learning.levels;
  const sections = useMemo(() => sectionStandings(levels), [levels]);
  const standings = useMemo(
    () => sections.flatMap((section) => section.levels),
    [sections],
  );
  const totals = pathTotals(levels, standings);
  const current = currentStanding(standings);
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = openId ?? current?.level.id ?? null;

  const begin = (standing: LevelStanding) => {
    const done = standings
      .filter((one) => one.status === 'complete')
      .map((one) => one.level);
    controller.start(
      standing.level,
      levels[standing.level.id],
      retentionPool(done, standing.level),
    );
  };

  if (controller.run)
    return <LearningRun controller={controller} settings={state.settings} />;

  if (controller.summary) {
    const standing = standings.find(
      (one) => one.level.id === controller.summary?.levelId,
    );
    if (standing)
      return (
        <RunSummary
          summary={controller.summary}
          standing={standing}
          settings={state.settings}
          onAgain={() => {
            controller.dismissSummary();
            begin(standing);
          }}
          onDone={controller.dismissSummary}
        />
      );
  }

  return (
    <div className="page learning-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t`Blocks to learn a note, mixtures to keep it.`}</p>
          <h1>{t`Learning path`}</h1>
          <p className="subheading">{t`Each press of Start is a short run built from what you currently need. A note counts as learned once it comes back correctly in several separate runs — coming back is what makes it stick.`}</p>
        </div>
        <div className="path-total">
          <strong>
            {totals.learned}/{totals.total}
          </strong>
          <small>{t`notes learned`}</small>
          <small className="path-levels">
            {t`${totals.levelsComplete} of ${standings.length} levels`}
          </small>
        </div>
      </div>
      {sections.map((section) => (
        <section
          className={`path-section status-${section.status}`}
          key={section.section.id}
        >
          <header className="section-head">
            <h2>{t(section.section.title)}</h2>
            <span className="section-tally">
              {section.levelsComplete}/{section.levels.length}
            </span>
          </header>
          <p className="section-blurb">{t(section.section.blurb)}</p>
          <ol className="level-list">
            {section.levels.map((standing) => (
              <LevelCard
                key={standing.level.id}
                standing={standing}
                lesson={levels[standing.level.id]}
                open={
                  standing.level.id === shown && standing.status !== 'locked'
                }
                settings={state.settings}
                onOpen={() =>
                  setOpenId(
                    standing.level.id === shown ? null : standing.level.id,
                  )
                }
                onStart={() => begin(standing)}
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
                  value={controller.input}
                  onChange={controller.setInput}
                />
                {controller.input === 'midi' ? (
                  <MidiStatus midi={controller.midi} />
                ) : null}
              </LevelCard>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
