import {
  Accidental,
  BarNote,
  Formatter,
  Renderer,
  SVGContext,
  Stave,
  StaveNote,
  Voice,
} from 'vexflow';

import {
  staffPosition,
  vexFlowKey,
  type Clef,
  type CanonicalPitch,
} from '../music/music';

import type { NoteShape } from './note-shapes';

const DURATIONS: Record<NoteShape, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

/** The staff is drawn in the container's CSS colour rather than a value read out of the DOM. */
const INK = 'currentColor';

/*
 * VexFlow registers its music font as a data URI when the module is imported, then lays a note
 * out from the browser's text metrics for that font. Drawing before the face is ready measures
 * the fallback font instead, which leaves the stem and the accidental parked away from the note
 * head, so callers wait on this before the first render.
 */
export const notationFontReady: Promise<unknown> =
  typeof document === 'undefined' || !document.fonts
    ? Promise.resolve()
    : Promise.all([
        document.fonts.load('30pt Bravura'),
        document.fonts.load('16pt Academico'),
      ]).catch(() => undefined);

/**
 * How much of the stave the note keeps clear at either end: enough after the clef that an
 * accidental never crowds it, and enough before the end that the note head is never clipped.
 */
const HEAD_GAP = 28;
const TAIL_GAP = 12;

/**
 * How far the note may wander from its leftmost spot, in staff spaces so that it tracks the size
 * of the staff rather than the width of the screen.
 *
 * The clef stays at the far left, and a session can switch between clefs from one question to the
 * next. A note free to roam a wide stave would leave the clef outside the reader's fixation, so a
 * treble-to-bass switch could pass unnoticed and the note be read in the wrong clef. Keeping the
 * travel short holds the clef and the note in view together, while still varying the note's
 * position enough that the eye has to find it.
 */
const MAX_TRAVEL_SPACES = 22;

/**
 * Slides the whole note to `placement` — 0 parks the head just past the clef, 1 puts it as far
 * along as the travel above allows. The head, not the note's left edge, is what lands on the
 * target: an accidental is drawn to the left of the head, and letting it push the head along
 * would make a sharp sit fractionally right of a natural, which is a positional hint about the
 * answer.
 *
 * `getAbsoluteX` reads the stave's note-start every time it is called, so moving the stave here
 * repositions the already-formatted note without a second formatting pass.
 */
function placeNote(stave: Stave, note: StaveNote, placement: number): void {
  const startX = stave.getNoteStartX();
  const leading = note.getNoteHeadBeginX() - startX;
  const headWidth = note.getNoteHeadEndX() - note.getNoteHeadBeginX();
  const first = startX + HEAD_GAP;
  const last = stave.getNoteEndX() - TAIL_GAP - headWidth;
  // A narrow stave runs out of room before the travel does, so the end of the stave still wins.
  const travel = Math.min(
    Math.max(0, last - first),
    stave.space(MAX_TRAVEL_SPACES),
  );
  const headX = first + Math.min(1, Math.max(0, placement)) * travel;
  stave.setNoteStartX(headX - leading);
}

function buildNote(
  value: CanonicalPitch,
  clef: Clef,
  duration: string,
): StaveNote {
  const note = new StaveNote({ keys: [vexFlowKey(value)], duration, clef });
  note.setStyle({ fillStyle: INK, strokeStyle: INK });
  if (value.accidental !== 'natural') {
    const accidental = new Accidental(value.accidental === 'sharp' ? '#' : 'b');
    accidental.setStyle({ fillStyle: INK, strokeStyle: INK });
    note.addModifier(accidental, 0);
  }
  return note;
}

export function renderNotation(
  container: HTMLDivElement,
  value: CanonicalPitch,
  clef: Clef,
  placement = 0,
  shape: NoteShape = 'quarter',
): void {
  container.replaceChildren();
  const width = Math.max(280, container.clientWidth || 560);
  const height = 220;
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  /*
   * VexFlow leaves the stave lines and clef to inherit from the <svg> root, which it sets to
   * black — invisible on a dark theme. Painting in `currentColor` hands every part of the
   * drawing to the container's CSS colour, so it follows the theme without a re-render.
   */
  if (context instanceof SVGContext) {
    context.svg.setAttribute('fill', INK);
    context.svg.setAttribute('stroke', INK);
  }
  const stave = new Stave(16, 55, width - 32);
  stave.addClef(clef);
  stave.setStyle({ fillStyle: INK, strokeStyle: INK });
  stave.setContext(context).draw();

  const note = buildNote(value, clef, DURATIONS[shape]);
  /* `placeNote` measures through `getAbsoluteX`, which ignores the stave until the note holds
   * one — `voice.draw` would attach it too late to be of any use here. */
  note.setStave(stave);
  /*
   * One note is not a bar, and the app never claims it is: a strict voice insists the
   * ticks add up, which rejects a half or a whole note outright and leaves nothing drawn.
   */
  const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
  voice.addTickable(note);
  voice.setStave(stave);
  new Formatter()
    .joinVoices([voice])
    .format([voice], Math.max(120, width - 150));
  placeNote(stave, note, placement);
  voice.draw(context, stave);
}

/*
 * The width a whole note asks for on a preview stave: an accidental sits to the left of its head
 * and needs the room. Rows are filled until the next note would not fit.
 */
const RANGE_NATURAL_WIDTH = 30;
const RANGE_ACCIDENTAL_WIDTH = 42;
/** A bar line closes each octave, so a long row reads in bars instead of one run of notes. */
const RANGE_BAR_WIDTH = 14;
/** The clef and the space after it, which a row cannot use for notes. */
const RANGE_CLEF_WIDTH = 72;
const RANGE_PADDING = 8;
/** A staff line is ten pixels apart, and a step (line to space) is half of that. */
const RANGE_STEP = 5;

function rangeWidth(value: CanonicalPitch): number {
  return value.accidental === 'natural'
    ? RANGE_NATURAL_WIDTH
    : RANGE_ACCIDENTAL_WIDTH;
}

/** The notes of a row with a bar line before each C; a row never starts on one. */
function withBars(row: readonly CanonicalPitch[]): (CanonicalPitch | 'bar')[] {
  return row.flatMap((value, index) =>
    index > 0 && value.name === 'C' && value.accidental === 'natural'
      ? (['bar', value] as const)
      : [value],
  );
}

function rowWidth(row: readonly CanonicalPitch[]): number {
  return withBars(row).reduce(
    (sum, one) => sum + (one === 'bar' ? RANGE_BAR_WIDTH : rangeWidth(one)),
    0,
  );
}

/**
 * Splits the notes into as few rows as fit, then evens the rows out: filling each to the brim
 * would leave the last with a single note stranded on a stave of its own.
 */
function rangeRows(
  pitches: readonly CanonicalPitch[],
  capacity: number,
): CanonicalPitch[][] {
  const total = rowWidth(pitches);
  const fill = (limit: number) => {
    const rows: CanonicalPitch[][] = [];
    for (const value of pitches) {
      const last = rows[rows.length - 1];
      if (!last || rowWidth([...last, value]) > limit) rows.push([value]);
      else last.push(value);
    }
    return rows;
  };
  /* Try the fewest rows first; a note that does not divide evenly can push the last row over,
   * and then one more row is needed. */
  for (let count = Math.max(1, Math.ceil(total / capacity)); ; count += 1) {
    const rows = fill(
      Math.min(capacity, total / count + RANGE_ACCIDENTAL_WIDTH / 2),
    );
    if (rows.length <= count || count >= pitches.length) return rows;
  }
}

/**
 * Every pitch of a range, low to high, as whole notes laid out left to right and wrapped onto
 * further staves when they run out of width — so a newcomer sees each note the range will ask,
 * sharps and flats included, rather than only its two ends. Each row reserves room for exactly
 * the ledger lines its own notes need, so a row of middle notes stays short.
 */
export function renderRange(
  container: HTMLDivElement,
  clef: Clef,
  pitches: readonly CanonicalPitch[],
): void {
  container.replaceChildren();
  const width = Math.max(240, container.clientWidth || 360);
  const staveWidth = width - RANGE_PADDING * 2;
  const rows = rangeRows(pitches, staveWidth - RANGE_CLEF_WIDTH - 8);
  if (rows.length === 0) rows.push([]);

  /* The top line of a stave sits at position 8; the bottom at 0. */
  const extents = rows.map((row) => {
    const positions = row.map((value) => staffPosition(value, clef));
    const above = Math.max(0, ...positions.map((position) => position - 8));
    const below = Math.max(0, ...positions.map((position) => -position));
    return {
      above: 1.5 + (above * RANGE_STEP) / 10,
      below: 1.5 + (below * RANGE_STEP) / 10,
    };
  });
  const heights = extents.map(({ above, below }) => (above + 4 + below) * 10);
  const height = heights.reduce((sum, one) => sum + one, 0) + RANGE_PADDING * 2;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  if (context instanceof SVGContext) {
    context.svg.setAttribute('fill', INK);
    context.svg.setAttribute('stroke', INK);
  }

  let top = RANGE_PADDING;
  rows.forEach((row, index) => {
    const { above, below } = extents[index];
    const stave = new Stave(RANGE_PADDING, top, staveWidth, {
      spaceAboveStaffLn: above,
      spaceBelowStaffLn: below,
    });
    stave.addClef(clef);
    stave.setStyle({ fillStyle: INK, strokeStyle: INK });
    stave.setContext(context).draw();
    top += heights[index];
    if (row.length === 0) return;

    const notes = withBars(row).map((one) => {
      const note =
        one === 'bar'
          ? new BarNote().setStyle({ fillStyle: INK, strokeStyle: INK })
          : buildNote(one, clef, 'w');
      note.setStave(stave);
      return note;
    });
    const voice = new Voice({ numBeats: 4 * row.length, beatValue: 4 })
      .setStrict(false)
      .addTickables(notes);
    voice.setStave(stave);
    const needed = rowWidth(row);
    new Formatter()
      .joinVoices([voice])
      .format([voice], Math.min(needed, staveWidth - RANGE_CLEF_WIDTH - 8));
    voice.draw(context, stave);
  });
}
