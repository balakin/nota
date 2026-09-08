export type Clef = 'treble' | 'bass';
export type PitchName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type Accidental = 'natural' | 'sharp' | 'flat';
export type NamingSystem = 'letters' | 'solfege';

export type CanonicalPitch = {
  name: PitchName;
  accidental: Accidental;
  octave: number;
  midi: number;
};

const LETTER_SEMITONES: Record<PitchName, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const LETTER_INDEX: Record<PitchName, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

const ACCIDENTAL_SEMITONES: Record<Accidental, number> = {
  natural: 0,
  sharp: 1,
  flat: -1,
};

/** The glyph shown to the learner, and the ASCII token used in stable ids. */
export const ACCIDENTAL_SIGN: Record<Accidental, string> = {
  natural: '',
  sharp: '♯',
  flat: '♭',
};
const ACCIDENTAL_TOKEN: Record<Accidental, string> = {
  natural: '',
  sharp: '#',
  flat: 'b',
};

const SOLFEGE: Record<PitchName, { en: string; ru: string }> = {
  C: { en: 'Do', ru: 'До' },
  D: { en: 'Re', ru: 'Ре' },
  E: { en: 'Mi', ru: 'Ми' },
  F: { en: 'Fa', ru: 'Фа' },
  G: { en: 'Sol', ru: 'Соль' },
  A: { en: 'La', ru: 'Ля' },
  B: { en: 'Si', ru: 'Си' },
};

export const SEMITONES_PER_OCTAVE = 12;

export function pitch(
  name: PitchName,
  octave: number,
  accidental: Accidental = 'natural',
): CanonicalPitch {
  return {
    name,
    accidental,
    octave,
    midi:
      SEMITONES_PER_OCTAVE * (octave + 1) +
      LETTER_SEMITONES[name] +
      ACCIDENTAL_SEMITONES[accidental],
  };
}

export function pitchId(value: CanonicalPitch): string {
  return `${value.name}${ACCIDENTAL_TOKEN[value.accidental]}${value.octave}`;
}

export function pitchFromId(id: string): CanonicalPitch | null {
  const match = /^([A-G])([#b]?)(\d+)$/.exec(id);
  if (!match) return null;
  const accidental: Accidental =
    match[2] === '#' ? 'sharp' : match[2] === 'b' ? 'flat' : 'natural';
  return pitch(match[1] as PitchName, Number(match[3]), accidental);
}

/** Resolves a MIDI number to its natural spelling; black keys have none, so they return null. */
export function pitchFromMidi(midi: number): CanonicalPitch | null {
  const octave = Math.floor(midi / SEMITONES_PER_OCTAVE) - 1;
  const semitone =
    ((midi % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) %
    SEMITONES_PER_OCTAVE;
  const name = (Object.entries(LETTER_SEMITONES).find(
    ([, value]) => value === semitone,
  )?.[0] ?? null) as PitchName | null;
  return name ? pitch(name, octave) : null;
}

/** The octave a MIDI number falls in, counting C as the start of the octave. */
export function octaveForMidi(midi: number): number {
  return Math.floor(midi / SEMITONES_PER_OCTAVE) - 1;
}

/** The letter or syllable alone, without the accidental sign. */
export function noteBaseName(
  value: CanonicalPitch,
  naming: NamingSystem,
  locale: 'en' | 'ru',
): string {
  return naming === 'letters' ? value.name : SOLFEGE[value.name][locale];
}

export function displayNoteName(
  value: CanonicalPitch,
  naming: NamingSystem,
  locale: 'en' | 'ru',
): string {
  return `${noteBaseName(value, naming, locale)}${ACCIDENTAL_SIGN[value.accidental]}`;
}

export function accessiblePitchLabel(
  value: CanonicalPitch,
  naming: NamingSystem,
  locale: 'en' | 'ru',
): string {
  const sign = ACCIDENTAL_SIGN[value.accidental];
  return `${value.name}${sign}${value.octave} / ${displayNoteName(value, naming, locale)} / ${
    SOLFEGE[value.name].ru
  }${sign}`;
}

export function vexFlowKey(value: CanonicalPitch): string {
  return `${value.name.toLowerCase()}${ACCIDENTAL_TOKEN[value.accidental]}/${value.octave}`;
}

export function diatonicIndex(value: CanonicalPitch): number {
  return value.octave * 7 + LETTER_INDEX[value.name];
}

/** Staff steps count upward from the bottom line (0) of the selected clef. */
export function staffPosition(value: CanonicalPitch, clef: Clef): number {
  const bottomLine = clef === 'treble' ? pitch('E', 4) : pitch('G', 2);
  return diatonicIndex(value) - diatonicIndex(bottomLine);
}

export function ledgerLineCount(value: CanonicalPitch, clef: Clef): number {
  const position = staffPosition(value, clef);
  if (position < 0) return Math.floor(Math.abs(position) / 2);
  if (position > 8) return Math.floor((position - 8) / 2);
  return 0;
}

export type RecognitionItem = {
  id: `${Clef}:${string}`;
  clef: Clef;
  pitch: CanonicalPitch;
};

export function recognitionItem(
  clef: Clef,
  value: CanonicalPitch,
): RecognitionItem {
  return { id: `${clef}:${pitchId(value)}`, clef, pitch: value };
}

/**
 * Curricula are ordered: notes unlock from the front, so naturals come first and the
 * accidentals follow in circle-of-fifths order (sharps, then flats). Both spellings of a
 * black key are separate items — they are answered by the same key but read differently.
 *
 * Notes outside the staff come last in each list. Reading them is a different act from
 * reading a note between the lines — counting outward from an edge rather than knowing a
 * position — so they are taught after the staff itself is secure. A pitch may appear in
 * both curricula: G3 on the bass staff and G3 two ledger lines under the treble staff are
 * the same key and two quite different sights.
 */
export const TREBLE_CURRICULUM: readonly RecognitionItem[] = [
  recognitionItem('treble', pitch('G', 4)),
  recognitionItem('treble', pitch('C', 5)),
  recognitionItem('treble', pitch('E', 4)),
  recognitionItem('treble', pitch('D', 4)),
  recognitionItem('treble', pitch('F', 4)),
  recognitionItem('treble', pitch('A', 4)),
  recognitionItem('treble', pitch('B', 4)),
  recognitionItem('treble', pitch('C', 4)),
  recognitionItem('treble', pitch('D', 5)),
  recognitionItem('treble', pitch('E', 5)),
  recognitionItem('treble', pitch('F', 5)),
  recognitionItem('treble', pitch('F', 4, 'sharp')),
  recognitionItem('treble', pitch('C', 5, 'sharp')),
  recognitionItem('treble', pitch('G', 4, 'sharp')),
  recognitionItem('treble', pitch('D', 5, 'sharp')),
  recognitionItem('treble', pitch('A', 4, 'sharp')),
  recognitionItem('treble', pitch('B', 4, 'flat')),
  recognitionItem('treble', pitch('E', 5, 'flat')),
  recognitionItem('treble', pitch('A', 4, 'flat')),
  recognitionItem('treble', pitch('D', 5, 'flat')),
  recognitionItem('treble', pitch('G', 4, 'flat')),
  /* Beyond the staff: the space just outside, then outward by ledger lines. */
  recognitionItem('treble', pitch('G', 5)),
  recognitionItem('treble', pitch('C', 6)),
  recognitionItem('treble', pitch('A', 5)),
  recognitionItem('treble', pitch('B', 5)),
  recognitionItem('treble', pitch('B', 3)),
  recognitionItem('treble', pitch('A', 3)),
  recognitionItem('treble', pitch('G', 3)),
];

export const BASS_CURRICULUM: readonly RecognitionItem[] = [
  recognitionItem('bass', pitch('F', 3)),
  recognitionItem('bass', pitch('C', 3)),
  recognitionItem('bass', pitch('C', 4)),
  recognitionItem('bass', pitch('E', 3)),
  recognitionItem('bass', pitch('G', 3)),
  recognitionItem('bass', pitch('D', 3)),
  recognitionItem('bass', pitch('A', 3)),
  recognitionItem('bass', pitch('B', 3)),
  /* The bottom of the bass staff, which the curriculum used to skip over entirely. */
  recognitionItem('bass', pitch('G', 2)),
  recognitionItem('bass', pitch('B', 2)),
  recognitionItem('bass', pitch('A', 2)),
  recognitionItem('bass', pitch('F', 3, 'sharp')),
  recognitionItem('bass', pitch('C', 3, 'sharp')),
  recognitionItem('bass', pitch('G', 3, 'sharp')),
  recognitionItem('bass', pitch('D', 3, 'sharp')),
  recognitionItem('bass', pitch('A', 3, 'sharp')),
  recognitionItem('bass', pitch('B', 3, 'flat')),
  recognitionItem('bass', pitch('E', 3, 'flat')),
  recognitionItem('bass', pitch('A', 3, 'flat')),
  recognitionItem('bass', pitch('D', 3, 'flat')),
  recognitionItem('bass', pitch('G', 3, 'flat')),
  /* Beyond the staff: down towards the left hand, and up towards the treble's own G. */
  recognitionItem('bass', pitch('F', 2)),
  recognitionItem('bass', pitch('C', 2)),
  recognitionItem('bass', pitch('E', 2)),
  recognitionItem('bass', pitch('D', 2)),
  recognitionItem('bass', pitch('D', 4)),
  recognitionItem('bass', pitch('G', 4)),
  recognitionItem('bass', pitch('E', 4)),
  recognitionItem('bass', pitch('F', 4)),
];

export const CURRICULUM: Record<Clef, readonly RecognitionItem[]> = {
  treble: TREBLE_CURRICULUM,
  bass: BASS_CURRICULUM,
};
