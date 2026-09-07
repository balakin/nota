import { useCallback, useEffect, useState } from 'react';

import { pageFromHash, type Page } from './pages';

/** Hash routing: the app is a single static bundle, so the hash is the whole router. */
export function usePage(): { page: Page; navigate: (page: Page) => void } {
  const [page, setPage] = useState<Page>(() =>
    pageFromHash(window.location.hash),
  );

  useEffect(() => {
    const onLocationChange = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);
    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, []);

  const navigate = useCallback((next: Page) => {
    window.history.replaceState(null, '', `#${next}`);
    setPage(next);
  }, []);

  return { page, navigate };
}
