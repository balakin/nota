import { useEffect, useRef, useState } from 'react';

/** The element's width, kept current across resizes, so a drawing can be redrawn to fit it. */
export function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const update = () => setWidth(ref.current?.clientWidth ?? 0);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
