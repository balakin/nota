import { defineConfig } from '@lingui/cli';

export default defineConfig({
  locales: ['en', 'ru'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['src'],
      exclude: ['src/locales/**', 'src/**/__tests__/**', 'src/vite-env.d.ts'],
    },
  ],
});
