import { describe, expect, it } from 'vitest';

import { pitch, pitchId } from '../../music/music';
import {
  BLACK_KEYS_PER_OCTAVE,
  WHITE_KEYS_PER_OCTAVE,
  octaveWindow,
  windowContains,
  windowForMidi,
} from '../piano-layout';

describe('one-octave piano layout', () => {
  it('always draws the same twelve keys, whatever the octave', () => {
    for (const octave of [2, 4, 6]) {
      const window = octaveWindow(octave);
      expect(window.whiteKeys).toHaveLength(WHITE_KEYS_PER_OCTAVE);
      expect(window.blackKeys).toHaveLength(BLACK_KEYS_PER_OCTAVE);
      expect(window.whiteKeys.map((key) => key.name)).toEqual([
        'C',
        'D',
        'E',
        'F',
        'G',
        'A',
        'B',
      ]);
      expect(window.blackKeys.map((key) => key.afterWhiteIndex)).toEqual([
        0, 1, 3, 4, 5,
      ]);
    }
  });

  it('gives every black key both spellings of the same pitch', () => {
    const window = octaveWindow(4);
    expect(window.blackKeys.map((key) => pitchId(key.sharp))).toEqual([
      'C#4',
      'D#4',
      'F#4',
      'G#4',
      'A#4',
    ]);
    expect(window.blackKeys.map((key) => pitchId(key.flat))).toEqual([
      'Db4',
      'Eb4',
      'Gb4',
      'Ab4',
      'Bb4',
    ]);
    expect(
      window.blackKeys.every((key) => key.sharp.midi === key.flat.midi),
    ).toBe(true);
  });

  it('anchors on the octave of the note being asked, so every note is answerable', () => {
    for (const value of [
      pitch('C', 4),
      pitch('F', 5, 'sharp'),
      pitch('B', 2, 'flat'),
    ]) {
      const window = windowForMidi(value.midi);
      expect(windowContains(window, value.midi)).toBe(true);
    }
  });

  it('keeps notes from other octaves out of the window', () => {
    const window = windowForMidi(pitch('C', 4).midi);
    expect(windowContains(window, pitch('C', 5).midi)).toBe(false);
    expect(windowContains(window, pitch('B', 3).midi)).toBe(false);
  });
});
