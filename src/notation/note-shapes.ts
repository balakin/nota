/**
 * Which note a shape is worth is not what this app asks about — but a note that is always
 * a quarter is always the same picture, and the learner can end up reading the picture.
 * A whole note has no stem at all, which leaves the note's place on the staff as the only
 * thing left to read; an eighth or a sixteenth adds a flag that the position never explains.
 */
export const NOTE_SHAPES = [
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
] as const;
export type NoteShape = (typeof NOTE_SHAPES)[number];

/** The head a question is drawn with: always a quarter unless shapes are being varied. */
export function pickNoteShape(
  vary: boolean,
  random: () => number = Math.random,
): NoteShape {
  if (!vary) return 'quarter';
  return NOTE_SHAPES[Math.floor(random() * NOTE_SHAPES.length)];
}
