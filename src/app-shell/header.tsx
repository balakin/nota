import { useLingui } from '@lingui/react/macro';
import type { Page } from '../router/pages';
import { Icon } from '../ui/icon';
import { PrimaryNav } from './primary-nav';

export function Header({ page, navigate }: { page: Page; navigate: (page: Page) => void }) {
  const { t } = useLingui();
  return (
    <header className="top-bar">
      <button
        className="brand brand-button"
        type="button"
        onClick={() => navigate('train')}
        aria-label={t`Nota`}
      >
        <span className="brand-mark">
          <Icon name="note" size={19} />
        </span>
        <span>Nota</span>
      </button>
      <PrimaryNav page={page} navigate={navigate} className="desktop-nav" />
      <div className="top-spacer" />
      <span className="domain-label">nota.balakin.io</span>
    </header>
  );
}
