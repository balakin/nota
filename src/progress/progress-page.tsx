import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';

import type { PersistedState } from '../app-state/app-state';
import { allRecognitionItems } from '../music/recognition-items';
import { accuracyOf, dayKeyOf, quantileMs } from '../training/rollups';
import { emptyNoteStats } from '../training/training';
import { SectionTitle } from '../ui/section-title';
import { formatResponse, formatSpan } from '../utils/format';

import { dashboardStats, type RangeDays } from './dashboard-stats';
import { HardestNotes } from './hardest-notes';
import { MasteryBand } from './mastery-band';
import { NoteMap } from './note-map';
import { RangeBar } from './range-bar';
import { SessionHistory } from './session-history';
import { StatTile } from './stat-tile';

export function ProgressPage({ state }: { state: PersistedState }) {
  const { t } = useLingui();
  const [range, setRange] = useState('30d');
  const [days, setDays] = useState<RangeDays>(30);
  // One clock reading per view: the ranges are day-sized and need not follow the tick.
  const [now] = useState(() => Date.now());

  const notes = useMemo(
    () =>
      allRecognitionItems().map(
        (item) => state.notes[item.id] ?? emptyNoteStats(item),
      ),
    [state.notes],
  );
  const stats = useMemo(
    () =>
      dashboardStats({
        rolls: state.rolls,
        sessions: state.sessions,
        days,
        now,
        dayOf: dayKeyOf,
      }),
    [state.rolls, state.sessions, days, now],
  );

  const seconds = state.settings.locale === 'ru' ? ' с' : 's';
  const accuracyNow = stats.totals.attempts
    ? accuracyOf(stats.totals) * 100
    : null;
  const accuracyBefore =
    stats.previous && stats.previous.attempts
      ? accuracyOf(stats.previous) * 100
      : null;
  const medianNow = quantileMs(stats.totals);
  const medianBefore = stats.previous ? quantileMs(stats.previous) : null;
  const practicedBefore = stats.previousPracticeSeconds;

  return (
    <div className="page progress-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t`Recognition gets useful when it is fast and retained.`}</p>
          <h1>{t`Your progress`}</h1>
        </div>
        <RangeBar
          range={range}
          onChange={(id, value) => {
            setRange(id);
            setDays(value);
          }}
        />
      </div>

      <section className="stat-grid">
        <StatTile
          label={t`Notes practiced`}
          value={`${String(stats.practicedItems)} / ${String(notes.length)}`}
          delta={
            stats.previousPracticedItems === null || stats.totals.attempts === 0
              ? null
              : stats.practicedItems - stats.previousPracticedItems
          }
          comparable={days !== null}
        />
        <StatTile
          label={t`Accuracy`}
          value={
            accuracyNow === null ? '—' : `${String(Math.round(accuracyNow))}%`
          }
          delta={
            accuracyNow === null || accuracyBefore === null
              ? null
              : accuracyNow - accuracyBefore
          }
          unit="%"
          comparable={days !== null}
        />
        <StatTile
          label={t`Median time per note`}
          value={formatResponse(medianNow, t`< 1s`, seconds)}
          delta={
            medianNow === null || medianBefore === null
              ? null
              : (medianNow - medianBefore) / 1000
          }
          unit="s"
          lowerIsBetter
          comparable={days !== null}
        />
        <StatTile
          label={t`Practice time`}
          value={formatSpan(
            stats.practiceSeconds,
            state.settings.locale === 'ru' ? 'ч' : 'h',
            state.settings.locale === 'ru' ? 'м' : 'm',
          )}
          delta={
            practicedBefore === null || stats.practiceSeconds === 0
              ? null
              : (stats.practiceSeconds - practicedBefore) / 60
          }
          unit={t`min`}
          comparable={days !== null}
        />
      </section>

      <MasteryBand notes={notes} />

      <section className="surface panel">
        <SectionTitle title={t`Accuracy and speed`} />
        <SessionHistory days={stats.days} locale={state.settings.locale} />
      </section>

      <section className="surface panel note-map-section">
        <SectionTitle title={t`Note mastery map`} />
        <p className="muted-copy map-caption">{t`Every note of the curriculum, in pitch order. Colour is your standing on it overall; the figure is how much you answered correctly in this range.`}</p>
        <NoteMap
          notes={notes}
          byItem={stats.byItem}
          lastSeenByItem={stats.lastSeenByItem}
          settings={state.settings}
        />
      </section>

      <section className="surface panel">
        <SectionTitle title={t`Hardest notes`} />
        <p className="muted-copy map-caption">{t`Ranked the way training picks its next question, so this is what a session will drill.`}</p>
        <HardestNotes
          notes={notes}
          byItem={stats.byItem}
          settings={state.settings}
          now={now}
        />
      </section>
    </div>
  );
}
