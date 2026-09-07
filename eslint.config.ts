import js from '@eslint/js';
import reactX from '@eslint-react/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { importX } from 'eslint-plugin-import-x';
import pluginLingui from 'eslint-plugin-lingui';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import testingLibrary from 'eslint-plugin-testing-library';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['**/dist', '**/coverage', '**/public']),

  // Everything TypeScript: type-checked rules, import hygiene, explicit type imports.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      importX.flatConfigs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/first': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-absolute-path': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-empty-named-blocks': 'error',
      'import-x/no-deprecated': 'warn',
      'import-x/no-unresolved': 'off',
      'import-x/named': 'off',
      'import-x/default': 'off',
      'import-x/namespace': 'off',
      'import-x/export': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
    },
  },

  {
    files: ['**/*.d.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // App source — React, hooks, react-refresh, lingui.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/__tests__/**'],
    extends: [
      reactX.configs['recommended-type-checked'],
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      pluginLingui.configs['flat/recommended'],
    ],
    rules: {
      'lingui/consistent-plural-format': 'warn',
      'lingui/no-plural-inside-trans': 'warn',
      // Kept off from the previous config: the catalogs interpolate object properties.
      'lingui/no-expression-in-message': 'off',
      'lingui/no-single-variables-to-translate': 'off',
    },
  },

  // Tests — React plus testing-library.
  {
    files: ['src/**/__tests__/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    extends: [
      reactX.configs['recommended-type-checked'],
      testingLibrary.configs['flat/react'],
    ],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  eslintConfigPrettier,
]);
