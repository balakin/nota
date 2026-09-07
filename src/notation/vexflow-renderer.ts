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

export function renderNotation(
  container: HTMLDivElement,
  value: CanonicalPitch,
  clef: Clef,
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
  const voice = new Voice({ numBeats: 1, beatValue: 4 });
  voice.addTickable(note);
  new Formatter()
    .joinVoices([voice])
    .format([voice], Math.max(120, width - 150));
  voice.draw(context, stave);
}
