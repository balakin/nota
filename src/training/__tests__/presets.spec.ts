import { describe, expect, it } from 'vitest';

import { RANGE_PRESETS } from '../presets';
import {
  clampRange,
  matchesPreset,
  selectedItems,
  type PitchRange,
} from '../selection';

describe('range presets', () => {
  it('has unique ids', () => {
    const ids = RANGE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays inside what its clefs offer and always has notes to ask', () => {
    for (const preset of RANGE_PRESETS) {
      expect(clampRange(preset.range, preset.clefs)).toEqual(preset.range);
      expect(
        selectedItems(preset.clefs, preset.range, preset.accidentals).length,
      ).toBeGreaterThan(0);
    }
  });

  it('keeps sharps and flats out of the presets that turn them off', () => {
    for (const preset of RANGE_PRESETS.filter((one) => !one.accidentals))
      for (const item of selectedItems(preset.clefs, preset.range, false))
        expect(item.pitch.accidental).toBe('natural');
  });

  it('starts with the smallest set of notes and ends with the widest', () => {
    const size = (index: number) => {
      const preset = RANGE_PRESETS[index];
      return selectedItems(preset.clefs, preset.range, preset.accidentals)
        .length;
    };
    const sizes = RANGE_PRESETS.map((_, index) => size(index));
    expect(sizes[0]).toBe(Math.min(...sizes));
    expect(sizes[sizes.length - 1]).toBe(Math.max(...sizes));
  });
});

describe('naturals only', () => {
  it('drops the sharps and flats a range would otherwise include', () => {
    const range: PitchRange = { from: 60, to: 71 };
    const all = selectedItems(['treble'], range, true);
    const naturals = selectedItems(['treble'], range, false);
    expect(naturals.length).toBeLessThan(all.length);
    expect(naturals.every((item) => item.pitch.accidental === 'natural')).toBe(
      true,
    );
  });

  it('recognises a preset only when clefs, range and accidentals all agree', () => {
    const preset = RANGE_PRESETS[0];
    expect(
      matchesPreset(preset, preset.clefs, preset.range, preset.accidentals),
    ).toBe(true);
    expect(
      matchesPreset(preset, preset.clefs, preset.range, !preset.accidentals),
    ).toBe(false);
    expect(
      matchesPreset(preset, ['bass'], preset.range, preset.accidentals),
    ).toBe(false);
  });
});
