import { describe, expect, it } from 'vitest';

import { NOTE_SHAPES, pickNoteShape } from '../note-shapes';

describe('note shape choice', () => {
  it('draws quarters only when shapes are not varied', () => {
    expect(pickNoteShape(false, () => 0.99)).toBe('quarter');
  });

  it('reaches every shape, and stays inside the list at the edges of the roll', () => {
    const rolls = [0, 0.19, 0.2, 0.41, 0.6, 0.81, 0.9999];
    const picked = new Set(
      rolls.map((roll) => pickNoteShape(true, () => roll)),
    );
    expect([...picked].sort()).toEqual([...NOTE_SHAPES].sort());
  });
});
