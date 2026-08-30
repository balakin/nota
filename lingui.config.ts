import { defineConfig } from '@lingui/cli';

export default defineConfig({
  locales: ['en', 'ru'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['src'],
      exclude: [
        'src/locales/**',
        'src/test/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/vite-env.d.ts',
      ],
    },
  ],
});
