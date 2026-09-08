import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../app-state/app-state';
import { i18n } from '../../i18n/i18n';
import { SettingsPage } from '../settings-page';

function mountSettings() {
  const onResetProgress = vi.fn();
  render(
    <I18nProvider i18n={i18n}>
      <SettingsPage
        settings={DEFAULT_SETTINGS}
        onChange={vi.fn()}
        navigate={vi.fn()}
        onResetProgress={onResetProgress}
      />
    </I18nProvider>,
  );
  return { onResetProgress };
}

describe('settings page', () => {
  it('resets progress only once the dialog is confirmed', () => {
    const { onResetProgress } = mountSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onResetProgress).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(onResetProgress).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your progress has been reset.',
    );
  });

  it('leaves progress alone when the dialog is cancelled', () => {
    const { onResetProgress } = mountSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onResetProgress).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
