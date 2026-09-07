import { useLingui } from '@lingui/react/macro';

import type { PersistedState } from '../app-state/app-state';
import { allRecognitionItems } from '../music/recognition-items';
import { emptyNoteStats, median, weakestNotes } from '../training/training';
import { Metric } from '../ui/metric';
import { SectionTitle } from '../ui/section-title';
import { formatDuration, formatResponse } from '../utils/format';

import { MasteryBand } from './mastery-band';
import { NoteMap } from './note-map';
import { SessionHistory } from './session-history';
import { WeakNotes } from './weak-notes';

export function ProgressPage({ state }: { state: PersistedState }) {
  const { t } = useLingui();
  const notes = allRecognitionItems().map(
    (item) => state.notes[item.id] ?? emptyNoteStats(item),
  );
  const practiced = notes.filter((note) => note.totalAttempts > 0);
  const totalAttempts = notes.reduce(
    (sum, note) => sum + note.totalAttempts,
    0,
  );
  const totalCorrect = notes.reduce(
    (sum, note) => sum + note.correctAttempts,
    0,
  );
  const responseTimes = notes.flatMap((note) => note.responseTimes);
  const totalSeconds = state.sessions.reduce(
    (sum, session) => sum + session.practiceSeconds,
    0,
  );
  return (
    <div className="page progress-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t`Recognition gets useful when it is fast and retained.`}</p>
          <h1>{t`Your progress`}</h1>
        </div>
      </div>
      <MasteryBand notes={notes} />
      <section className="metric-grid">
        <Metric
          label={t`Accuracy`}
          value={`${totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0}%`}
        />
        <Metric
          label={t`Median response`}
          value={formatResponse(
            median(responseTimes),
            t`< 1s`,
            state.settings.locale === 'ru' ? ' с' : 's',
          )}
        />
        <Metric label={t`Notes seen`} value={practiced.length} />
        <Metric label={t`Training time`} value={formatDuration(totalSeconds)} />
      </section>
      <section className="surface note-map-section">
        <SectionTitle title={t`Note mastery map`} />
        <p className="muted-copy map-caption">{t`Every note you will meet, in pitch order. Colour is how well you know it; the figure is the share you have answered correctly.`}</p>
        <NoteMap notes={notes} settings={state.settings} />
      </section>
      <div className="progress-layout">
        <section className="surface">
          <SectionTitle title={t`Weakest notes`} />
          <WeakNotes
            notes={weakestNotes(practiced, 5)}
            settings={state.settings}
          />
        </section>
        <section className="surface">
          <SessionHistory
            sessions={state.sessions}
            locale={state.settings.locale}
          />
        </section>
      </div>
    </div>
  );
}
