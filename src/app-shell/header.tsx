import { useLingui } from '@lingui/react/macro';

import type { Page } from '../router/pages';
import { BrandMark } from '../ui/brand-mark';
import { Icon } from '../ui/icon';

import { PrimaryNav } from './primary-nav';

export function Header({
  page,
  navigate,
}: {
  page: Page;
  navigate: (page: Page) => void;
}) {
  const { t } = useLingui();
  return (
    <header className="top-bar">
      <button
        className="brand brand-button"
        type="button"
        onClick={() => navigate('train')}
        aria-label={t`Nota`}
      >
        <BrandMark />
        <span>Nota</span>
      </button>
      <PrimaryNav page={page} navigate={navigate} className="desktop-nav" />
      <div className="top-spacer" />
      <a
        className="icon-link"
        href="https://github.com/balakin/nota"
        target="_blank"
        rel="noreferrer"
        aria-label={t`Nota on GitHub`}
      >
        <Icon name="github" size={19} />
      </a>
    </header>
  );
}
