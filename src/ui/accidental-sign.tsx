import type { Accidental } from '../music/music';

/**
 * ♯ and ♭ are missing from the UI face, so the browser substitutes them from whatever
 * the system happens to carry — a different design, at a weight that never matches the
 * text. Drawing them keeps one shape everywhere and lets them inherit colour and weight.
 */
const GLYPHS = {
  sharp: {
    viewBox: '0 0 42 100',
    width: '0.46em',
    path: 'M11 18h5.5v74H11zM25.5 10H31v74h-5.5zM2 44 40 34v10L2 54zM2 68 40 58v10L2 78z',
  },
  flat: {
    viewBox: '0 0 34 100',
    width: '0.4em',
    path: 'M7 3h5.5v90H7zM12.5 52c8.5-10 17.5-3 17.5 10 0 12-10 20-17.5 31V80c5.5-6 10.5-12 10.5-18.5 0-6.5-5.5-6.5-10.5 0.5z',
  },
} as const;

export function AccidentalSign({ accidental }: { accidental: Accidental }) {
  if (accidental === 'natural') return null;
  const glyph = GLYPHS[accidental];
  return (
    <svg
      className="accidental"
      viewBox={glyph.viewBox}
      width={glyph.width}
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={glyph.path} />
    </svg>
  );
}
