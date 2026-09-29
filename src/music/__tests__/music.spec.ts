import { describe, expect, it } from 'vitest';

import {
  CURRICULUM,
  displayNoteName,
  pitchFromId,
  ledgerLineCount,
  pitch,
  pitchFromMidi,
  pitchId,
  staffPosition,
  vexFlowKey,
} from '../music';

describe('canonical music mapping', () => {
  it('maps C4 to MIDI 60 and back', () => {
    expect(pitch('C', 4)).toEqual({
      name: 'C',
      accidental: 'natural',
      octave: 4,
      midi: 60,
    });
    expect(pitchFromMidi(60)).toEqual(pitch('C', 4));
    expect(pitchId(pitch('C', 4))).toBe('C4');
  });

  it('spells accidentals in both directions', () => {
    expect(pitch('C', 4, 'sharp').midi).toBe(61);
    expect(pitch('D', 4, 'flat').midi).toBe(61);
    expect(pitchId(pitch('C', 4, 'sharp'))).toBe('C#4');
    expect(pitchId(pitch('D', 4, 'flat'))).toBe('Db4');
    expect(pitchFromId('C#4')).toEqual(pitch('C', 4, 'sharp'));
    expect(pitchFromId('Db4')).toEqual(pitch('D', 4, 'flat'));
    expect(pitchFromId('B4')).toEqual(pitch('B', 4));
  });

  it('reads accidentals on the staff line of their natural letter', () => {
    expect(staffPosition(pitch('F', 4, 'sharp'), 'treble')).toBe(
      staffPosition(pitch('F', 4), 'treble'),
    );
    expect(vexFlowKey(pitch('F', 4, 'sharp'))).toBe('f#/4');
    expect(vexFlowKey(pitch('B', 4, 'flat'))).toBe('bb/4');
    expect(displayNoteName(pitch('F', 4, 'sharp'), 'letters', 'en')).toBe('F♯');
    expect(displayNoteName(pitch('B', 4, 'flat'), 'solfege', 'ru')).toBe('Си♭');
  });

  it('keeps musical naming separate from locale', () => {
    expect(displayNoteName(pitch('G', 4), 'letters', 'ru')).toBe('G');
    expect(displayNoteName(pitch('G', 4), 'solfege', 'en')).toBe('Sol');
    expect(displayNoteName(pitch('G', 4), 'solfege', 'ru')).toBe('Соль');
  });

  it('maps staff positions from each clef bottom line', () => {
    expect(staffPosition(pitch('E', 4), 'treble')).toBe(0);
    expect(staffPosition(pitch('G', 4), 'treble')).toBe(2);
    expect(staffPosition(pitch('C', 4), 'treble')).toBe(-2);
    expect(staffPosition(pitch('G', 2), 'bass')).toBe(0);
    expect(staffPosition(pitch('C', 4), 'bass')).toBe(10);
  });

  it('reports ledger lines and notation keys', () => {
    expect(ledgerLineCount(pitch('C', 4), 'treble')).toBe(1);
    expect(ledgerLineCount(pitch('D', 4), 'treble')).toBe(0);
    expect(ledgerLineCount(pitch('G', 5), 'treble')).toBe(0);
    expect(ledgerLineCount(pitch('C', 4), 'bass')).toBe(1);
    expect(vexFlowKey(pitch('F', 5))).toBe('f/5');
  });
});

describe('curriculum coverage', () => {
  it.each(['treble', 'bass'] as const)(
    'asks every key between the ends of the %s range, black keys in both spellings',
    (clef) => {
      const items = CURRICULUM[clef];
      const midis = items.map((item) => item.pitch.midi);
      const low = Math.min(...midis);
      const high = Math.max(...midis);
      for (let midi = low; midi <= high; midi += 1) {
        const spellings = items.filter((item) => item.pitch.midi === midi);
        const black = [1, 3, 6, 8, 10].includes(midi % 12);
        expect(spellings.map((item) => item.pitch.accidental).sort()).toEqual(
          black ? ['flat', 'sharp'] : ['natural'],
        );
      }
    },
  );

  it('has no item twice', () => {
    const ids = [...CURRICULUM.treble, ...CURRICULUM.bass].map(
      (item) => item.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
