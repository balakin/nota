import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function PwaRegisterer() {
  useEffect(() => {
    if (!import.meta.env.DEV) registerSW({ immediate: true });
  }, []);
  return null;
}
