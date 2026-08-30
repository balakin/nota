import { useLingui } from '@lingui/react/macro';
import type { Locale } from '../app/state';
import { displayNoteName, type NamingSystem, type PitchName } from '../music/music';
import { pianoAnswer, type NormalizedAnswer } from '../training/input';

const NAMES: PitchName[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NAME_MIDI: Record<PitchName, number> = { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, B: 71 };

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
      {NAMES.map((name) => (
        <button
          className="name-choice"
          type="button"
          key={name}
          disabled={disabled}
          aria-label={displayNoteName({ name, octave: 4, midi: NAME_MIDI[name] }, naming, locale)}
          onClick={() => onAnswer(pianoAnswer(NAME_MIDI[name]))}
        >
          {displayNoteName({ name, octave: 4, midi: NAME_MIDI[name] }, naming, locale)}
        </button>
      ))}
    </div>
  );
}
