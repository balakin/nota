import { VitePWA } from 'vite-plugin-pwa';
import { lingui } from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    // The macro plugin expands `t`...`` / `<Trans>` into plain i18n calls, so it
    // has to run on every file Babel sees — dev, build and tests alike.
    react({ babel: { plugins: ['@lingui/babel-plugin-lingui-macro'] } }),
    // Compiles src/locales/*.po on the fly; `lingui compile` is not needed.
    lingui({ failOnMissing: mode === 'production', failOnCompileError: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Nota — Musical Note Recognition',
        short_name: 'Nota',
        description: 'Train instant musical note recognition.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f7fa',
        theme_color: '#7099c4',
        lang: 'en',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
  server: { host: '0.0.0.0' },
}));
