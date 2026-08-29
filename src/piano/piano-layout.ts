import type { CanonicalPitch, RecognitionItem } from '../music/music';
import { ALL_NATURAL_PITCHES } from '../music/music';

export type PointerProfile = 'coarse' | 'fine';
export type BlackPianoKey = { midi: number; name: string; afterWhiteIndex: number };

export type KeyboardWindow = {
  startIndex: number;
  endIndex: number;
  whiteKeys: CanonicalPitch[];
  blackKeys: BlackPianoKey[];
};

export const POINTER_TARGET_WIDTH: Record<PointerProfile, number> = { coarse: 46, fine: 37 };
const MIN_WHITE_KEYS = 7;
const MAX_WHITE_KEYS = 32;

export function targetWhiteKeyWidth(pointer: PointerProfile): number {
  return POINTER_TARGET_WIDTH[pointer];
}

export function visibleWhiteKeyCount(availableWidth: number, pointer: PointerProfile): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return MIN_WHITE_KEYS;
  return Math.max(
    MIN_WHITE_KEYS,
    Math.min(MAX_WHITE_KEYS, Math.floor(availableWidth / targetWhiteKeyWidth(pointer))),
  );
}

export function naturalIndexForMidi(midi: number): number {
  const index = ALL_NATURAL_PITCHES.findIndex((value) => value.midi === midi);
  return index === -1 ? 0 : index;
}

export function keyboardWindow(
  availableWidth: number,
  pointer: PointerProfile,
  anchorMidi?: number,
): KeyboardWindow {
  const count = Math.min(visibleWhiteKeyCount(availableWidth, pointer), ALL_NATURAL_PITCHES.length);
  const anchor =
    anchorMidi === undefined
      ? Math.floor(ALL_NATURAL_PITCHES.length / 2)
      : naturalIndexForMidi(anchorMidi);
  const startIndex = Math.max(
    0,
    Math.min(ALL_NATURAL_PITCHES.length - count, anchor - Math.floor(count / 2)),
  );
  return makeWindow(startIndex, count);
}

export function makeWindow(startIndex: number, count: number): KeyboardWindow {
  const safeStart = Math.max(0, Math.min(ALL_NATURAL_PITCHES.length - 1, startIndex));
  const endIndex = Math.min(ALL_NATURAL_PITCHES.length - 1, safeStart + Math.max(1, count) - 1);
  const whiteKeys = ALL_NATURAL_PITCHES.slice(safeStart, endIndex + 1) as CanonicalPitch[];
  const firstMidi = whiteKeys[0]?.midi ?? ALL_NATURAL_PITCHES[0].midi;
  const lastMidi = whiteKeys.at(-1)?.midi ?? firstMidi;
  const blackNames: Record<number, string> = {
    1: 'C♯',
    3: 'D♯',
    6: 'F♯',
    8: 'G♯',
    10: 'A♯',
  };
  const blackKeys = Array.from(
    { length: Math.max(0, lastMidi - firstMidi) },
    (_, index) => firstMidi + index + 1,
  )
    .filter((midi) => blackNames[midi % 12] !== undefined)
    .map((midi) => ({
      midi,
      name: blackNames[midi % 12],
      afterWhiteIndex: naturalIndexForMidi(midi - 1) - safeStart,
    }));
  return { startIndex: safeStart, endIndex, whiteKeys, blackKeys };
}

export function planKeyboard(
  availableWidth: number,
  pointer: PointerProfile,
  candidates: readonly RecognitionItem[],
  anchorMidi?: number,
): { window: KeyboardWindow; candidates: RecognitionItem[] } {
  const count = Math.min(visibleWhiteKeyCount(availableWidth, pointer), ALL_NATURAL_PITCHES.length);
  const candidateIndices = candidates.map((item) => naturalIndexForMidi(item.pitch.midi));
  const focusIndex =
    anchorMidi === undefined
      ? (candidateIndices[0] ?? Math.floor(ALL_NATURAL_PITCHES.length / 2))
      : naturalIndexForMidi(anchorMidi);
  const startIndex = Math.max(
    0,
    Math.min(ALL_NATURAL_PITCHES.length - count, focusIndex - Math.floor(count / 2)),
  );
  const window = makeWindow(startIndex, count);
  const allowed = new Set(window.whiteKeys.map((value) => value.midi));
  const fittingCandidates = candidates.filter((item) => allowed.has(item.pitch.midi));
  return {
    window,
    candidates: fittingCandidates.length > 0 ? fittingCandidates : candidates.slice(0, 1),
  };
}

export function windowContains(window: KeyboardWindow, midi: number): boolean {
  return window.whiteKeys.some((value) => value.midi === midi);
}
