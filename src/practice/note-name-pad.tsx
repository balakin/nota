import { useLingui } from '@lingui/react/macro';
import type { Locale } from '../app-state/app-state';
import {
  ACCIDENTAL_SIGN,
  displayNoteName,
  noteBaseName,
  type CanonicalPitch,
  type NamingSystem,
} from '../music/music';
import { octaveWindow } from '../piano/piano-layout';
import { pianoAnswer, type NormalizedAnswer } from '../training/input';

/** Names are octave-free; a reference octave only supplies the pitch classes to answer with. */
const PAD = octaveWindow(4);

/** Few UI faces carry ♯ and ♭, so the sign is set separately and kerned back to the letter. */
function NoteLabel({
  value,
  naming,
  locale,
}: {
  value: CanonicalPitch;
  naming: NamingSystem;
  locale: Locale;
}) {
  return (
    <span className="note-label">
      {noteBaseName(value, naming, locale)}
      <span className="accidental">{ACCIDENTAL_SIGN[value.accidental]}</span>
    </span>
  );
}

export function NoteNamePad({
  naming,
  locale,
  disabled,
  onAnswer,
}: {
  naming: NamingSystem;
  locale: Locale;
  disabled?: boolean;
  onAnswer: (answer: NormalizedAnswer) => void;
}) {
  const { t } = useLingui();
  return (
    <div className="name-pad" aria-label={t`Note names`}>
      {PAD.blackKeys.map(({ midi, sharp, flat, afterWhiteIndex }) => {
        const sharpName = displayNoteName(sharp, naming, locale);
        const flatName = displayNoteName(flat, naming, locale);
        return (
          <button
            className="name-choice name-choice-accidental"
            style={{ gridColumn: `${afterWhiteIndex * 2 + 2} / span 2` }}
            type="button"
            key={midi}
            disabled={disabled}
            aria-label={`${sharpName} · ${flatName}`}
            onClick={() => onAnswer(pianoAnswer(midi))}
          >
            <NoteLabel value={sharp} naming={naming} locale={locale} />
            <small>
              <NoteLabel value={flat} naming={naming} locale={locale} />
            </small>
          </button>
        );
      })}
      {PAD.whiteKeys.map((key, index) => {
        const name = displayNoteName(key, naming, locale);
        return (
          <button
            className="name-choice"
            style={{ gridColumn: `${index * 2 + 1} / span 2` }}
            type="button"
            key={key.midi}
            disabled={disabled}
            aria-label={name}
            onClick={() => onAnswer(pianoAnswer(key.midi))}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
