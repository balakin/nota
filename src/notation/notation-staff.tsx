import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';

import type { Locale } from '../app-state/app-state';
import {
  accessiblePitchLabel,
  type Clef,
  type CanonicalPitch,
} from '../music/music';

/**
 * Where along the stave this question's note sits, as a fraction of the room the renderer has.
 * It is a hash of the seed rather than a roll at render time, because the staff redraws on every
 * resize and theme change — a fresh number there would slide the note out from under the reader
 * mid-question.
 *
 * The seed is a question counter, so the hash has to scatter consecutive integers well: a weaker
 * mix sends the note alternating left, right, left down the session, which reads as a rhythm the
 * learner can follow instead of a note they have to find. This is murmur3's finalizer.
 */
function placementForSeed(seed: number): number {
  let hash = seed | 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 0x1_0000_0000;
}

export function NotationStaff({
  pitch,
  clef,
  locale,
  placementSeed = 0,
}: {
  pitch: CanonicalPitch;
  clef: Clef;
  locale: Locale;
  /** Identifies the question, so the note keeps its spot for as long as it is being asked. */
  placementSeed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const { t } = useLingui();

  useEffect(() => {
    if (!ref.current) return;
    const update = () => setWidth(ref.current?.clientWidth ?? 0);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import('./vexflow-renderer').then(
      async ({ renderNotation, notationFontReady }) => {
        await notationFontReady;
        if (!ref.current || cancelled) return;
        try {
          renderNotation(
            ref.current,
            pitch,
            clef,
            placementForSeed(placementSeed),
          );
        } catch {
          ref.current.replaceChildren();
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [pitch, clef, width, placementSeed]);

  return (
    <div className="staff-wrap">
      <div
        ref={ref}
        className="staff-renderer"
        role="img"
        aria-label={t`Staff, ${clef === 'treble' ? t`Treble` : t`Bass`}, ${accessiblePitchLabel(pitch, 'solfege', locale)}`}
      />
    </div>
  );
}
