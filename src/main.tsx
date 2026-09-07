import './index.css';
import { I18nProvider } from '@lingui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app-shell/app';
import { browserLocale, i18n } from './i18n/i18n';
import { PwaRegisterer } from './pwa/pwa-registerer';

i18n.activate(browserLocale());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <App />
      <PwaRegisterer />
    </I18nProvider>
  </StrictMode>,
);
