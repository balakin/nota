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
  /** Index of the white key it sits to the right of. */
  afterWhiteIndex: number;
};

export type KeyboardWindow = {
  octave: number;
  whiteKeys: CanonicalPitch[];
  blackKeys: BlackPianoKey[];
};

export const WHITE_KEYS_PER_OCTAVE = 7;
export const BLACK_KEYS_PER_OCTAVE = 5;

const WHITE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const BLACK_KEYS = [
  { sharpOf: 'C', flatOf: 'D', afterWhiteIndex: 0 },
  { sharpOf: 'D', flatOf: 'E', afterWhiteIndex: 1 },
  { sharpOf: 'F', flatOf: 'G', afterWhiteIndex: 3 },
  { sharpOf: 'G', flatOf: 'A', afterWhiteIndex: 4 },
  { sharpOf: 'A', flatOf: 'B', afterWhiteIndex: 5 },
] as const;

export function octaveWindow(octave: number): KeyboardWindow {
  return {
    octave,
    whiteKeys: WHITE_NAMES.map((name) => pitch(name, octave)),
    blackKeys: BLACK_KEYS.map(({ sharpOf, flatOf, afterWhiteIndex }) => {
      const sharp = pitch(sharpOf, octave, 'sharp');
      return { midi: sharp.midi, sharp, flat: pitch(flatOf, octave, 'flat'), afterWhiteIndex };
    }),
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
