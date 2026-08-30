import { useEffect, useRef, useState } from 'react';

/**
 * Measures the element the keyboard will be drawn into. `remeasureOn` re-runs the
 * measurement when the surrounding layout swaps (a page change, a session start).
 */
export function useKeyboardWidth(remeasureOn: readonly unknown[]): {
  width: number;
  measureRef: React.RefObject<HTMLDivElement | null>;
} {
  const measureRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(measureRef.current?.clientWidth ?? window.innerWidth - 32);
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (measureRef.current && observer) observer.observe(measureRef.current);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, remeasureOn);

  return { width, measureRef };
}
