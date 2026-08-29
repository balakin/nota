/** @type {import('@lingui/conf').LinguiConfig} */
export default {
  locales: ['en', 'ru'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: 'src/locales/{locale}',
      include: ['src'],
    },
  ],
};
