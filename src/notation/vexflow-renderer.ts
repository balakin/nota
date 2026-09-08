import {
  Accidental,
  Formatter,
  Renderer,
  SVGContext,
  Stave,
  StaveNote,
  Voice,
} from 'vexflow';

import { vexFlowKey, type Clef, type CanonicalPitch } from '../music/music';

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

export function renderNotation(
  container: HTMLDivElement,
  value: CanonicalPitch,
  clef: Clef,
  placement = 0,
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

  const note = new StaveNote({
    keys: [vexFlowKey(value)],
    duration: 'q',
    clef,
  });
  note.setStyle({ fillStyle: INK, strokeStyle: INK });
  if (value.accidental !== 'natural') {
    const accidental = new Accidental(value.accidental === 'sharp' ? '#' : 'b');
    accidental.setStyle({ fillStyle: INK, strokeStyle: INK });
    note.addModifier(accidental, 0);
  }
  /* `placeNote` measures through `getAbsoluteX`, which ignores the stave until the note holds
   * one — `voice.draw` would attach it too late to be of any use here. */
  note.setStave(stave);
  const voice = new Voice({ numBeats: 1, beatValue: 4 });
  voice.addTickable(note);
  voice.setStave(stave);
  new Formatter()
    .joinVoices([voice])
    .format([voice], Math.max(120, width - 150));
  placeNote(stave, note, placement);
  voice.draw(context, stave);
}
