import { Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';
import { vexFlowKey, type Clef, type CanonicalPitch } from '../music/music';

export function renderNotation(container: HTMLDivElement, value: CanonicalPitch, clef: Clef): void {
  container.replaceChildren();
  const width = Math.max(280, container.clientWidth || 560);
  const height = 220;
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();
  const foreground =
    getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || '#253142';
  const stave = new Stave(16, 55, width - 32);
  stave.addClef(clef);
  stave.setStyle({ fillStyle: foreground, strokeStyle: foreground });
  stave.setContext(context).draw();

  const note = new StaveNote({ keys: [vexFlowKey(value)], duration: 'q', clef });
  note.setStyle({ fillStyle: foreground, strokeStyle: foreground });
  const voice = new Voice({ numBeats: 1, beatValue: 4 });
  voice.addTickable(note);
  new Formatter().joinVoices([voice]).format([voice], Math.max(120, width - 150));
  voice.draw(context, stave);
}
