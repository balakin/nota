import { useLingui } from '@lingui/react/macro';

import type { Locale } from '../app-state/app-state';
import type { NamingSystem } from '../music/music';
import { Icon } from '../ui/icon';
import { TogglePicker } from '../ui/toggle-picker';

import { MidiStatus } from './midi-status';
import { ModeExplainer } from './mode-explainer';
import { ModePicker } from './mode-picker';
import { TrainingRangePicker } from './range-picker';
import { SESSION_DURATIONS } from './session';
import { SpeedDeadlinePicker } from './speed-deadline-picker';
import type { PracticeSessionController } from './use-practice-session';

export function SessionSetup({
  practice,
  locale,
  naming,
}: {
  practice: PracticeSessionController;
  locale: Locale;
  naming: NamingSystem;
}) {
  const { t } = useLingui();
  return (
    <div className="page train-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t`Train instant musical note recognition.`}</p>
          <h1>{t`Recognition practice`}</h1>
          <p className="subheading">{t`Look at the staff, then answer without counting.`}</p>
        </div>
      </div>
      <div className="start-grid">
        <section className="setup-panel">
          <ModePicker
            mode={practice.mode}
            speedDeadlineMs={practice.speedDeadlineMs}
            locale={locale}
            onChange={practice.setMode}
          />
          {practice.mode === 'speed' ? (
            <SpeedDeadlinePicker
              deadlineMs={practice.speedDeadlineMs}
              locale={locale}
              onChange={practice.setSpeedDeadlineMs}
            />
          ) : null}
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
          <TogglePicker
            label={t`Clefs`}
            options={
              [
                ['both', t`Treble + Bass`],
                ['treble', t`Treble`],
                ['bass', t`Bass`],
              ] as const
            }
            value={practice.clefs.length === 2 ? 'both' : practice.clefs[0]}
            onChange={(value) =>
              practice.setClefs(value === 'both' ? ['treble', 'bass'] : [value])
            }
          />
          <TrainingRangePicker
            clefs={practice.clefs}
            range={practice.range}
            naming={naming}
            locale={locale}
            onChange={practice.setRange}
          />
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
          <button
            className="button button-primary button-large start-button"
            type="button"
            onClick={practice.start}
          >
            <Icon name="play" size={18} /> {t`Start`}
          </button>
        </section>
        <ModeExplainer
          mode={practice.mode}
          speedDeadlineMs={practice.speedDeadlineMs}
          locale={locale}
        />
      </div>
      <p className="local-note">
        <Icon name="check" size={16} />{' '}
        {t`Nota is a small, local-first tool. Your progress stays on this device.`}
      </p>
    </div>
  );
}
