import { useEffect, useRef, useState } from 'react';
import { accessiblePitchLabel, type Clef, type CanonicalPitch } from '../music/music';
import type { Locale } from '../app/state';
import { useTranslation } from '../i18n/use-translation';

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
  const t = useTranslation();

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
        aria-label={t('aria.staff', 'Staff, {clef}, {note}', {
          clef: clef === 'treble' ? t('clef.treble', 'Treble') : t('clef.bass', 'Bass'),
          note: accessiblePitchLabel(pitch, 'solfege', locale),
        })}
      />
    </div>
  );
}
