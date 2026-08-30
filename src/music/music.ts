export type Clef = 'treble' | 'bass';
export type PitchName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export type NamingSystem = 'letters' | 'solfege';

export type CanonicalPitch = {
  name: PitchName;
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

const SOLFEGE: Record<PitchName, { en: string; ru: string }> = {
  C: { en: 'Do', ru: 'До' },
  D: { en: 'Re', ru: 'Ре' },
  E: { en: 'Mi', ru: 'Ми' },
  F: { en: 'Fa', ru: 'Фа' },
  G: { en: 'Sol', ru: 'Соль' },
  A: { en: 'La', ru: 'Ля' },
  B: { en: 'Si', ru: 'Си' },
};

export function pitch(name: PitchName, octave: number): CanonicalPitch {
  return { name, octave, midi: 12 * (octave + 1) + LETTER_SEMITONES[name] };
}

export function pitchId(value: CanonicalPitch): string {
  return `${value.name}${value.octave}`;
}

export function pitchFromId(id: string): CanonicalPitch | null {
  const match = /^([A-G])(\d+)$/.exec(id);
  if (!match) return null;
  return pitch(match[1] as PitchName, Number(match[2]));
}

export function pitchFromMidi(midi: number): CanonicalPitch | null {
  const octave = Math.floor(midi / 12) - 1;
  const semitone = ((midi % 12) + 12) % 12;
  const name = (Object.entries(LETTER_SEMITONES).find(([, value]) => value === semitone)?.[0] ??
    null) as PitchName | null;
  return name ? pitch(name, octave) : null;
}

export function displayNoteName(
  value: CanonicalPitch,
  naming: NamingSystem,
  locale: 'en' | 'ru',
): string {
  if (naming === 'letters') return value.name;
  return SOLFEGE[value.name][locale];
}

export function accessiblePitchLabel(
  value: CanonicalPitch,
  naming: NamingSystem,
  locale: 'en' | 'ru',
): string {
  return `${value.name}${value.octave} / ${displayNoteName(value, naming, locale)} / ${
    SOLFEGE[value.name].ru
  }`;
}

export function vexFlowKey(value: CanonicalPitch): string {
  return `${value.name.toLowerCase()}/${value.octave}`;
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

export function recognitionItem(clef: Clef, value: CanonicalPitch): RecognitionItem {
  return { id: `${clef}:${pitchId(value)}`, clef, pitch: value };
}

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
];

export const CURRICULUM: Record<Clef, readonly RecognitionItem[]> = {
  treble: TREBLE_CURRICULUM,
  bass: BASS_CURRICULUM,
};

export const ALL_NATURAL_PITCHES: readonly CanonicalPitch[] = (
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as PitchName[]
)
  .flatMap((name) => Array.from({ length: 4 }, (_, index) => pitch(name, index + 2)))
  .filter((value) => value.midi >= 43 && value.midi <= 77)
  .sort((a, b) => a.midi - b.midi);
