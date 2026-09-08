import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

import type { AppSettings } from '../app-state/app-state';
import { displayNoteName } from '../music/music';
import { NotationStaff } from '../notation/notation-staff';
import { Piano } from '../piano/piano';
import { MidiStatus } from '../practice/midi-status';
import { NoteNamePad } from '../practice/note-name-pad';
import { keyboardAnswer } from '../training/input';
import { Icon } from '../ui/icon';
import { formatResponse } from '../utils/format';

import { NoteHint } from './note-hint';
import { CHECK_DEADLINE_MS } from './run-plan';
import type { LearningRunController } from './use-learning-run';

/** Home row plays the seven white keys; the row above plays the five black keys. */
const WHITE_KEYS: Record<string, number> = {
  a: 0,
  s: 1,
  d: 2,
  f: 3,
  g: 4,
  h: 5,
  j: 6,
};
const BLACK_KEYS: Record<string, number> = { w: 0, e: 1, t: 2, y: 3, u: 4 };

export function LearningRun({
  controller,
  settings,
}: {
  controller: LearningRunController;
  settings: AppSettings;
}) {
  const { t } = useLingui();
  const { run, feedback, input, midi } = controller;
  const [now, setNow] = useState(() => Date.now());
  const teaching = run?.step.kind === 'teach';
  const timed = run?.step.kind === 'ask' && run.step.timed;
  const locked = Boolean(feedback);

  useEffect(() => {
    if (!timed) return;
    const timer = window.setInterval(() => setNow(Date.now()), 60);
    return () => window.clearInterval(timer);
  }, [timed]);

  useEffect(() => {
    if (!run || input === 'names') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (locked || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const white = WHITE_KEYS[key];
      const black = BLACK_KEYS[key];
      const target =
        white !== undefined
          ? run.keyboardWindow.whiteKeys[white]
          : black !== undefined
            ? run.keyboardWindow.blackKeys[black]
            : undefined;
      if (!target) return;
      event.preventDefault();
      controller.answer(keyboardAnswer(target.midi));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controller, input, locked, run]);

  if (!run) return null;
  const item = run.step.item;
  const name = displayNoteName(item.pitch, settings.naming, settings.locale);
  const remaining = timed
    ? Math.max(0, 1 - (now - run.stepStartedAt) / CHECK_DEADLINE_MS)
    : null;
  /* A teach card names the note outright; the hint ladder is for the questions. */
  const hintDepth = teaching
    ? 1
    : feedback && feedback.result !== 'correct'
      ? 1
      : run.hint;

  return (
    <div className="practice-page learning-run">
      <div className="practice-toolbar">
        <span className="practice-counter">
          {t(run.level.title)}
          {' · '}
          {teaching ? t`New note` : timed ? t`Check` : t`Practice`}
        </span>
        <span className="run-pips" aria-label={t`Run progress`}>
          {Array.from({ length: run.planned }, (_, index) => (
            <span
              key={index}
              className={index < run.answered ? 'is-done' : ''}
            />
          ))}
        </span>
        <div className="toolbar-actions">
          <button
            className="quiet-button finish-button"
            type="button"
            onClick={controller.quit}
          >
            {t`End run`}
          </button>
        </div>
      </div>
      <div className="practice-stage">
        <div
          className={`timing-line ${timed ? 'timed' : ''} ${feedback ? `feedback-${feedback.result}` : ''}`}
          style={
            remaining === null
              ? undefined
              : { transform: `scaleX(${String(remaining)})` }
          }
        />
        <div
          className={`staff-stage ${feedback ? `is-${feedback.result}` : ''} ${teaching ? 'is-teaching' : ''}`}
        >
          {feedback?.result === 'timeout' ? (
            <div className="staff-cleared" aria-label={t`Time`}>
              —
            </div>
          ) : (
            <NotationStaff
              pitch={item.pitch}
              clef={item.clef}
              locale={settings.locale}
              placementSeed={run.answered}
            />
          )}
        </div>
        <div className="answer-status">
          {teaching ? (
            <div className="teach-card">
              <p className="teach-name">
                {t`This is`} <strong>{name}</strong>
              </p>
              <NoteHint
                item={item}
                depth={hintDepth}
                naming={settings.naming}
                locale={settings.locale}
              />
              <p className="teach-prompt">
                {input === 'names'
                  ? t`Press its name to go on.`
                  : t`Play the highlighted key to go on.`}
              </p>
            </div>
          ) : feedback ? (
            <div className={`feedback-banner ${feedback.result}`} role="status">
              <span className="feedback-icon">
                <Icon
                  name={feedback.result === 'correct' ? 'check' : 'clock'}
                  size={18}
                />
              </span>
              <span>
                <strong>
                  {feedback.result === 'correct'
                    ? feedback.hinted
                      ? t`Right — but hinted`
                      : t`Correct`
                    : feedback.result === 'timeout'
                      ? t`Time`
                      : t`Not quite`}
                </strong>
                {feedback.result === 'correct' ? (
                  <small>
                    {feedback.hinted
                      ? t`No credit for a hinted answer.`
                      : formatResponse(
                          feedback.elapsedMs,
                          t`< 1s`,
                          settings.locale === 'ru' ? ' с' : 's',
                        )}
                  </small>
                ) : (
                  <small>
                    {t`It is`} {name}
                  </small>
                )}
              </span>
            </div>
          ) : (
            <div className="ask-status">
              <NoteHint
                item={item}
                depth={run.hint}
                naming={settings.naming}
                locale={settings.locale}
              />
              {run.hint === 0 ? (
                <button
                  type="button"
                  className="quiet-button hint-button"
                  onClick={controller.showHint}
                  disabled={Boolean(timed)}
                >
                  <Icon name="lock" size={14} /> {t`Show me`}
                </button>
              ) : null}
            </div>
          )}
          {/* The corrective hint follows a miss: the error is the moment the note lands. */}
          {feedback && feedback.result !== 'correct' ? (
            <NoteHint
              item={item}
              depth={1}
              naming={settings.naming}
              locale={settings.locale}
            />
          ) : null}
        </div>
        <div
          className={`answer-area ${input === 'names' ? '' : 'answer-area-keyboard'}`}
        >
          {input === 'names' ? (
            <NoteNamePad
              naming={settings.naming}
              locale={settings.locale}
              disabled={locked}
              onAnswer={controller.answer}
            />
          ) : (
            <Piano
              window={run.keyboardWindow}
              naming={settings.naming}
              locale={settings.locale}
              highlightMidi={teaching || feedback ? item.pitch.midi : undefined}
              disabled={locked}
              onAnswer={controller.answer}
            />
          )}
        </div>
        {input === 'midi' ? <MidiStatus midi={midi} /> : null}
      </div>
    </div>
  );
}
