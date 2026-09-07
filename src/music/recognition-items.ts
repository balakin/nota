import { CURRICULUM, type Clef, type RecognitionItem } from './music';

export function allRecognitionItems(): RecognitionItem[] {
  return [...CURRICULUM.treble, ...CURRICULUM.bass];
}

export function findRecognitionItem(
  itemId: string,
): RecognitionItem | undefined {
  return allRecognitionItems().find((candidate) => candidate.id === itemId);
}

export function clefForItemId(id: string): Clef | null {
  if (id.startsWith('treble:')) return 'treble';
  if (id.startsWith('bass:')) return 'bass';
  return null;
}
