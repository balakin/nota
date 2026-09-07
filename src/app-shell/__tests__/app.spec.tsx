import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';

import { i18n } from '../../i18n/i18n';
import App from '../app';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

describe('Nota shell', () => {
  it('offers the first-run naming choice', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <App />
      </I18nProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: /Don.t count/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Start training/i }),
    ).toBeInTheDocument();
  });
});
