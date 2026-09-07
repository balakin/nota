import { useLingui } from '@lingui/react/macro';

import type { Locale } from '../app-state/app-state';
import { accessiblePitchLabel, type NamingSystem } from '../music/music';
import { pianoAnswer, type NormalizedAnswer } from '../training/input';

import type { KeyboardWindow } from './piano-layout';
import { BLACK_KEY_WIDTH_RATIO, WHITE_KEYS_PER_OCTAVE } from './piano-layout';

/** Positions in white-key widths become percentages of the one-octave key bed. */
const octaveFraction = (widths: number) =>
  `${(widths / WHITE_KEYS_PER_OCTAVE) * 100}%`;

export function Piano({
  window,
  naming,
  locale,
  highlightMidi,
  disabled,
  onAnswer,
}: {
  window: KeyboardWindow;
  naming: NamingSystem;
  locale: Locale;
  highlightMidi?: number;
  disabled?: boolean;
  onAnswer: (answer: NormalizedAnswer) => void;
}) {
  const { t } = useLingui();

  return (
    <div className="piano-shell" aria-label={t`Piano`}>
      <span className="piano-case piano-case-left" aria-hidden="true" />
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
            />
          ))}
        </div>
        <div className="black-keys">
          {window.blackKeys.map(({ midi, sharp, flat, center }) => (
            <button
              className={`piano-key piano-key-black ${highlightMidi === midi ? 'is-highlighted' : ''}`}
              style={{
                left: octaveFraction(center),
                width: octaveFraction(BLACK_KEY_WIDTH_RATIO),
              }}
              type="button"
              key={midi}
              disabled={disabled}
              aria-label={`${accessiblePitchLabel(sharp, naming, locale)} · ${accessiblePitchLabel(flat, naming, locale)}`}
              onClick={() => onAnswer(pianoAnswer(midi))}
            />
          ))}
        </div>
      </div>
      <span className="piano-case piano-case-right" aria-hidden="true" />
    </div>
  );
}
