import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import type { AppSettings } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { NotationStaff } from '../notation/notation-staff';
import { Piano } from '../piano/piano';
import { keyboardAnswer, type NormalizedAnswer } from '../training/input';
import { SPEED_DEADLINE_MS, type NoteStats } from '../training/training';
import { Icon } from '../ui/icon';
import { formatDuration } from '../utils/format';

import { FeedbackBanner } from './feedback-banner';
import { NoteNamePad } from './note-name-pad';
import type { Feedback, RuntimeSession } from './session';

/** Home row plays the seven white keys; the row above plays the five black keys. */
const WHITE_KEY_SHORTCUTS: Record<string, number> = {
  a: 0,
  s: 1,
  d: 2,
  f: 3,
  g: 4,
  h: 5,
  j: 6,
};
const BLACK_KEY_SHORTCUTS: Record<string, number> = {
  w: 0,
  e: 1,
  t: 2,
  y: 3,
  u: 4,
};

export function PracticeSession({
  session,
  feedback,
  settings,
  notes,
  onAnswer,
  onPause,
  onFinish,
}: {
  session: RuntimeSession;
  feedback: Feedback | null;
  settings: AppSettings;
  notes: Readonly<Record<string, NoteStats>>;
  onAnswer: (answer: NormalizedAnswer) => void;
  onPause: () => void;
  onFinish: () => void;
}) {
  const { t } = useLingui();
  const [now, setNow] = useState(() => Date.now());
  const { mode, input } = session;
  const answerDisabled = Boolean(feedback) || session.paused;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (input !== 'piano') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (answerDisabled || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const key = event.key.toLowerCase();
      const white = WHITE_KEY_SHORTCUTS[key];
      const black = BLACK_KEY_SHORTCUTS[key];
      const target =
        white !== undefined
          ? session.keyboardWindow.whiteKeys[white]
          : black !== undefined
            ? session.keyboardWindow.blackKeys[black]
            : undefined;
      if (!target) return;
      event.preventDefault();
      onAnswer(keyboardAnswer(target.midi));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answerDisabled, input, onAnswer, session.keyboardWindow]);

  const timingNow =
    session.paused && session.pausedAt !== null ? session.pausedAt : now;
  const elapsed = Math.min(
    session.durationSeconds,
    Math.floor((timingNow - session.startedAt) / 1000),
  );
  const questionElapsed = Math.min(
    session.deadlineMs ?? SPEED_DEADLINE_MS,
    timingNow - session.currentStartedAt,
  );
  const timerProgress = session.deadlineMs
    ? Math.max(0, 1 - questionElapsed / session.deadlineMs)
    : null;
  const currentStats = notes[session.current.id];
  const isIntroduction =
    !feedback &&
    mode === 'practice' &&
    (currentStats?.totalAttempts ?? 0) === 0;
  const currentName = displayNoteName(
    session.current.pitch,
    settings.naming,
    settings.locale,
  );

  return (
    <div className="practice-page">
      <div className="practice-toolbar">
        <span className="practice-counter">{t`Question ${session.questionNumber} of ${'∞'}`}</span>
        <span className="practice-mode-label">
          {mode === 'speed' ? t`Speed` : t`Practice`} ·{' '}
          {formatDuration(elapsed)}
        </span>
        <div className="toolbar-actions">
          <button className="quiet-button" type="button" onClick={onPause}>
            <Icon name={session.paused ? 'play' : 'clock'} size={16} />{' '}
            {session.paused ? t`Resume` : t`Pause`}
          </button>
          <button
            className="quiet-button finish-button"
            type="button"
            onClick={onFinish}
          >
            {t`Finish session`}
          </button>
        </div>
      </div>
      <div className="practice-stage">
        <div
          className={`timing-line ${session.deadlineMs ? 'timed' : ''} ${feedback ? `feedback-${feedback.result}` : ''}`}
          style={
            timerProgress === null
              ? undefined
              : { transform: `scaleX(${timerProgress})` }
          }
        />
        <div
          className={`staff-stage ${feedback ? `is-${feedback.result}` : ''} ${session.paused ? 'is-paused' : ''}`}
        >
          {session.paused ? (
            <div className="paused-copy">
              <Icon name="clock" size={28} />
              <strong>{t`Pause`}</strong>
            </div>
          ) : feedback?.result === 'timeout' ? (
            <div className="staff-cleared" aria-label={t`Time`}>
              —
            </div>
          ) : (
            <NotationStaff
              pitch={session.current.pitch}
              clef={session.current.clef}
              locale={settings.locale}
            />
          )}
        </div>
        {/* One slot for both, so the staff does not move when feedback replaces the prompt. */}
        <div className="answer-status">
          {feedback ? (
            <FeedbackBanner
              feedback={feedback}
              naming={settings.naming}
              locale={settings.locale}
            />
          ) : (
            <p
              className={`answer-prompt ${isIntroduction ? 'intro-prompt' : ''}`}
            >
              {isIntroduction
                ? t`New note: ${currentName} · press the highlighted key to meet it.`
                : t`Use the piano key that matches the note.`}
            </p>
          )}
        </div>
        <div
          className={`answer-area ${input === 'piano' ? 'answer-area-keyboard' : ''}`}
        >
          {input === 'piano' ? (
            <Piano
              window={session.keyboardWindow}
              naming={settings.naming}
              locale={settings.locale}
              highlightMidi={
                feedback?.item.pitch.midi ??
                (isIntroduction ? session.current.pitch.midi : undefined)
              }
              disabled={answerDisabled}
              onAnswer={onAnswer}
            />
          ) : (
            <NoteNamePad
              naming={settings.naming}
              locale={settings.locale}
              disabled={answerDisabled}
              onAnswer={onAnswer}
            />
          )}
        </div>
        {mode === 'speed' ? (
          <span className={`speed-caption ${feedback ? 'is-hidden' : ''}`}>
            <Icon name="clock" size={14} /> {t`Speed`} ·{' '}
            {t`${settings.locale === 'ru' ? '2,0' : '2.0'}s`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
