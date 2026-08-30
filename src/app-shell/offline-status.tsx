import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';

export function OfflineStatus() {
  const { t } = useLingui();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return (
    <div className={`offline-status ${online ? 'is-online' : ''}`} role="status">
      <span className="status-dot" />{' '}
      {online ? t`Back online` : t`Offline — progress is saved on this device`}
    </div>
  );
}
