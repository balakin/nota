import { useLingui } from '@lingui/react/macro';
import type { KeyboardWindow } from './piano-layout';
import { accessiblePitchLabel, displayNoteName, type NamingSystem } from '../music/music';
import type { Locale } from '../app-state/app-state';
import { pianoAnswer, type NormalizedAnswer } from '../training/input';

export function Piano({
  window,
  naming,
  locale,
  showLabels,
  highlightMidi,
  disabled,
  onAnswer,
}: {
  window: KeyboardWindow;
  naming: NamingSystem;
  locale: Locale;
  showLabels: boolean;
  highlightMidi?: number;
  disabled?: boolean;
  onAnswer: (answer: NormalizedAnswer) => void;
}) {
  const { t } = useLingui();

  return (
    <div className="piano-shell" aria-label={t`Piano`}>
      <div className="piano">
        <div className="white-keys">
          {window.whiteKeys.map((key) => (
            <button
              className={`piano-key piano-key-white ${highlightMidi === key.midi ? 'is-highlighted' : ''}`}
              type="button"
              key={key.midi}
              disabled={disabled}
              aria-label={accessiblePitchLabel(key, naming, locale)}
              onClick={() => onAnswer(pianoAnswer(key.midi))}
            >
              {showLabels ? <span>{displayNoteName(key, naming, locale)}</span> : null}
            </button>
          ))}
        </div>
        <div className="black-keys">
          {window.blackKeys.map(({ midi, sharp, flat, afterWhiteIndex }) => (
            <button
              className={`piano-key piano-key-black ${highlightMidi === midi ? 'is-highlighted' : ''}`}
              style={{ left: `calc(${afterWhiteIndex + 1} * (100% / 7))` }}
              type="button"
              key={midi}
              disabled={disabled}
              aria-label={`${accessiblePitchLabel(sharp, naming, locale)} · ${accessiblePitchLabel(flat, naming, locale)}`}
              onClick={() => onAnswer(pianoAnswer(midi))}
            >
              {showLabels ? (
                <span>
                  {displayNoteName(sharp, naming, locale)}
                  <small>{displayNoteName(flat, naming, locale)}</small>
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
