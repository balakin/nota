import { useLingui } from '@lingui/react/macro';

import type { PersistedState } from '../app-state/app-state';
import { allRecognitionItems } from '../music/recognition-items';
import { emptyNoteStats, median, weakestNotes } from '../training/training';
import { Metric } from '../ui/metric';
import { SectionTitle } from '../ui/section-title';
import { formatDuration, formatResponse } from '../utils/format';

import { ClefProgress } from './clef-progress';
import { NoteMapItem } from './note-map-item';
import { WeakNotes } from './weak-notes';

export function ProgressPage({ state }: { state: PersistedState }) {
  const { t } = useLingui();
  const notes = allRecognitionItems().map(
    (item) => state.notes[item.id] ?? emptyNoteStats(item),
  );
  const practiced = notes.filter((note) => note.totalAttempts > 0);
  const fluent = notes.filter((note) => note.state === 'fluent').length;
  const recognized = notes.filter(
    (note) => note.state === 'recognized' || note.state === 'fluent',
  ).length;
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
      <section className="metric-grid">
        <Metric label={t`Fluent notes`} value={fluent} />
        <Metric label={t`Recognized notes`} value={recognized} />
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
        <Metric label={t`Training time`} value={formatDuration(totalSeconds)} />
      </section>
      <div className="progress-layout">
        <section className="surface">
          <SectionTitle title={t`By clef`} />
          <div className="clef-progress">
            <ClefProgress
              clef="treble"
              notes={notes.filter((note) => note.clef === 'treble')}
            />
            <ClefProgress
              clef="bass"
              notes={notes.filter((note) => note.clef === 'bass')}
            />
          </div>
        </section>
        <section className="surface">
          <SectionTitle title={t`Weakest notes`} />
          <WeakNotes
            notes={weakestNotes(practiced, 4)}
            settings={state.settings}
          />
        </section>
      </div>
      <section className="surface note-map-section">
        <SectionTitle title={t`Note mastery map`} />
        <p className="muted-copy">{t`Your note map will fill in as you practice.`}</p>
        <div className="note-map">
          {notes.map((note) => (
            <NoteMapItem
              key={note.itemId}
              note={note}
              settings={state.settings}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
