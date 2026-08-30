import { useLingui } from '@lingui/react/macro';
import type { Clef } from '../music/music';
import type { NoteStats } from '../training/training';

export function ClefProgress({ clef, notes }: { clef: Clef; notes: NoteStats[] }) {
  const { t } = useLingui();
  const practiced = notes.filter((note) => note.totalAttempts > 0);
  const correct = notes.reduce((sum, note) => sum + note.correctAttempts, 0);
  const attempts = notes.reduce((sum, note) => sum + note.totalAttempts, 0);
  return (
    <div className="clef-block">
      <div className="clef-title">
        <span className={`clef-symbol ${clef}`}>{clef === 'treble' ? '𝄞' : '𝄢'}</span>
        <strong>{clef === 'treble' ? t`Treble` : t`Bass`}</strong>
        <span>
          {practiced.length}/{notes.length}
        </span>
      </div>
      <div className="bar-track">
        <span style={{ width: `${notes.length ? (practiced.length / notes.length) * 100 : 0}%` }} />
      </div>
      <small>
        {attempts ? `${Math.round((correct / attempts) * 100)}% ${t`accuracy`}` : t`New`}
      </small>
    </div>
  );
}
