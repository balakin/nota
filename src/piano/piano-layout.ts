import type { CanonicalPitch } from '../music/music';
import { octaveForMidi, pitch } from '../music/music';

/**
 * The keyboard is always exactly one octave — seven white keys and the five black keys
 * between them — so it looks and behaves identically on every screen. Only the octave it
 * stands for changes, and since every octave is drawn the same way, re-anchoring it on the
 * note being asked moves nothing on screen.
 */

export type BlackPianoKey = {
  midi: number;
  /** The two spellings of the same key; both are correct answers for it. */
  sharp: CanonicalPitch;
  flat: CanonicalPitch;
  /** Index of the white key it sits to the right of — the grid position for a name pad. */
  afterWhiteIndex: number;
  /** Centre on a drawn keyboard, in white-key widths from the left edge of C. */
  center: number;
};

export type KeyboardWindow = {
  octave: number;
  whiteKeys: CanonicalPitch[];
  blackKeys: BlackPianoKey[];
};

export const WHITE_KEYS_PER_OCTAVE = 7;
export const BLACK_KEYS_PER_OCTAVE = 5;

/**
 * A black key is narrower than a white one, and its centre is not the boundary between two
 * white keys: within each group the space behind the black keys is split evenly, which pulls
 * C♯ and F♯ left and pushes D♯ and A♯ right. Getting this wrong is what makes a drawn
 * keyboard read as a cartoon.
 */
export const BLACK_KEY_WIDTH_RATIO = 0.6;

const WHITE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const BLACK_KEYS = [
  { sharpOf: 'C', flatOf: 'D', afterWhiteIndex: 0, center: 0.9 },
  { sharpOf: 'D', flatOf: 'E', afterWhiteIndex: 1, center: 2.1 },
  { sharpOf: 'F', flatOf: 'G', afterWhiteIndex: 3, center: 3.85 },
  { sharpOf: 'G', flatOf: 'A', afterWhiteIndex: 4, center: 5 },
  { sharpOf: 'A', flatOf: 'B', afterWhiteIndex: 5, center: 6.15 },
] as const;

export function octaveWindow(octave: number): KeyboardWindow {
  return {
    octave,
    whiteKeys: WHITE_NAMES.map((name) => pitch(name, octave)),
    blackKeys: BLACK_KEYS.map(
      ({ sharpOf, flatOf, afterWhiteIndex, center }) => {
        const sharp = pitch(sharpOf, octave, 'sharp');
        return {
          midi: sharp.midi,
          sharp,
          flat: pitch(flatOf, octave, 'flat'),
          afterWhiteIndex,
          center,
        };
      },
    ),
  };
}

/** The octave window that contains a note, so the note is always answerable. */
export function windowForMidi(midi: number): KeyboardWindow {
  return octaveWindow(octaveForMidi(midi));
}

export function windowContains(window: KeyboardWindow, midi: number): boolean {
  return (
    window.whiteKeys.some((key) => key.midi === midi) ||
    window.blackKeys.some((key) => key.midi === midi)
  );
}
