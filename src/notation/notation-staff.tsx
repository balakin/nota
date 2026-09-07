import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';

import type { Locale } from '../app-state/app-state';
import {
  accessiblePitchLabel,
  type Clef,
  type CanonicalPitch,
} from '../music/music';

export function NotationStaff({
  pitch,
  clef,
  locale,
}: {
  pitch: CanonicalPitch;
  clef: Clef;
  locale: Locale;
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
    void import('./vexflow-renderer').then(({ renderNotation }) => {
      if (!ref.current || cancelled) return;
      try {
        renderNotation(ref.current, pitch, clef);
      } catch {
        ref.current.replaceChildren();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pitch, clef, width]);

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
