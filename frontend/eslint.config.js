import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
<<<<<<< HEAD
import tseslint from 'typescript-eslint';
=======
>>>>>>> 3effed8 (chuyển tsx -> jsx)
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
<<<<<<< HEAD
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
=======
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
>>>>>>> 3effed8 (chuyển tsx -> jsx)
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
<<<<<<< HEAD
      globals: globals.browser,
    },
    rules: {
      'react-hooks/incompatible-library': 'off',
=======
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'react-hooks/incompatible-library': 'off',
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
>>>>>>> 3effed8 (chuyển tsx -> jsx)
    },
  },
]);
