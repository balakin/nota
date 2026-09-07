import { useLingui } from '@lingui/react/macro';

import type { Page } from '../router/pages';

import { NavButton } from './nav-button';

/** The same three destinations back the desktop header and the mobile tab bar. */
export function PrimaryNav({
  page,
  navigate,
  className,
}: {
  page: Page;
  navigate: (page: Page) => void;
  className: string;
}) {
  const { t } = useLingui();
  return (
    <nav className={className} aria-label={t`Primary navigation`}>
      <NavButton
        active={page === 'train'}
        icon="play"
        label={t`Train`}
        onClick={() => navigate('train')}
      />
      <NavButton
        active={page === 'progress'}
        icon="chart"
        label={t`Progress`}
        onClick={() => navigate('progress')}
      />
      <NavButton
        active={page === 'settings' || page === 'research'}
        icon="settings"
        label={t`Settings`}
        onClick={() => navigate('settings')}
      />
    </nav>
  );
}
