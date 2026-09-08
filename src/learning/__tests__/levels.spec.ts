import { describe, expect, it } from 'vitest';

import { allRecognitionItems } from '../../music/recognition-items';
import { findLevel, LEVELS, SECTIONS, timesEveryQuestion } from '../levels';

const blocks = LEVELS.filter((level) => level.kind === 'block');

describe('the learning path', () => {
  it('partitions the whole curriculum across its block levels, once each', () => {
    const ids = blocks.flatMap((level) => level.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      allRecognitionItems()
        .map((item) => item.id)
        .sort(),
    );
  });

  it('gives every section a mixed level to finish on', () => {
    for (const section of SECTIONS) {
      expect(section.levels.length).toBeGreaterThan(0);
      expect(section.levels[section.levels.length - 1].kind).toBe('mixed');
    }
  });

  it('teaches landmarks first and displays notes by pitch', () => {
    const first = findLevel('treble-middle');
    expect(first?.teachOrder[0].id).toBe('treble:G4');
    expect(first?.items.map((item) => item.id)).toEqual([
      'treble:C4',
      'treble:D4',
      'treble:E4',
      'treble:F4',
      'treble:G4',
      'treble:A4',
      'treble:B4',
    ]);
    expect(findLevel('bass-anchor')?.teachOrder[0].id).toBe('bass:F3');
    expect(findLevel('bass-upper')?.teachOrder[0].id).toBe('bass:C4');
  });

  it('holds no empty level, and asks fewer credits of the harder ones', () => {
    for (const level of LEVELS) {
      expect(level.items.length).toBeGreaterThan(0);
      expect(level.credits).toBeGreaterThan(0);
    }
    expect(findLevel('treble-middle')?.credits).toBe(3);
    expect(findLevel('treble-staff')?.credits).toBe(2);
    expect(findLevel('whole-staff')?.credits).toBe(1);
  });

  it("puts a mixed level's whole section inside it", () => {
    const mixed = findLevel('treble-staff');
    const ids = new Set(mixed?.items.map((item) => item.id));
    for (const item of findLevel('treble-middle')?.items ?? [])
      expect(ids.has(item.id)).toBe(true);
    for (const item of findLevel('treble-upper')?.items ?? [])
      expect(ids.has(item.id)).toBe(true);
  });

  it('runs the clock on every question of a mixed level only', () => {
    expect(timesEveryQuestion(findLevel('treble-staff')!)).toBe(true);
    expect(timesEveryQuestion(findLevel('treble-middle')!)).toBe(false);
  });

  it('bridges the clefs on the one key both of them write', () => {
    expect(
      findLevel('middle-c')
        ?.items.map((item) => item.id)
        .sort(),
    ).toEqual(['bass:C4', 'treble:C4']);
  });
});
