import { describe, expect, it } from 'vitest';

import { allRecognitionItems } from '../../music/recognition-items';
import { findLevel, LEVELS } from '../levels';

describe('the learning path', () => {
  it('covers every curriculum note exactly once', () => {
    const ids = LEVELS.flatMap((level) => level.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      allRecognitionItems()
        .map((item) => item.id)
        .sort(),
    );
  });

  it('holds no empty level, and orders each one low to high', () => {
    for (const level of LEVELS) {
      expect(level.items.length).toBeGreaterThan(0);
      const midis = level.items.map((item) => item.pitch.midi);
      expect(midis).toEqual([...midis].sort((a, b) => a - b));
      expect(level.items.every((item) => item.clef === level.clef)).toBe(true);
    }
  });

  it('starts with the seven naturals of the treble middle octave', () => {
    expect(LEVELS[0].items.map((item) => item.pitch.name)).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ]);
  });

  it('finds a level by id, and nothing for an unknown one', () => {
    expect(findLevel('treble-octave-4')?.clef).toBe('treble');
    expect(findLevel('nowhere')).toBeUndefined();
  });
});
