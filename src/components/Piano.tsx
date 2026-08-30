import { useLingui } from '@lingui/react/macro';
import type { KeyboardWindow } from '../piano/piano-layout';
import { accessiblePitchLabel, displayNoteName, type NamingSystem } from '../music/music';
import type { Locale } from '../app/state';
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
  const visibleStart = window.whiteKeys[0]?.midi ?? 0;
  const visibleEnd = window.whiteKeys.at(-1)?.midi ?? 0;

  return (
    <div className="piano-shell" aria-label={t`Piano`}>
      <div
        className="piano"
        style={{ '--white-key-count': window.whiteKeys.length } as React.CSSProperties}
      >
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
        <div className="black-keys" aria-hidden="true">
          {window.blackKeys
            .filter(({ midi }) => midi > visibleStart && midi < visibleEnd + 1)
            .map(({ midi, name, afterWhiteIndex }) => (
              <button
                className="piano-key piano-key-black"
                style={{ left: `calc(${afterWhiteIndex + 1} * (100% / var(--white-key-count)))` }}
                type="button"
                key={midi}
                disabled
                tabIndex={-1}
                aria-label={`${name} · ${t`Not trained yet`}`}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
