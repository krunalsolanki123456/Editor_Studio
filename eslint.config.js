import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      // Block attributes are dynamic by design — any is intentional
      '@typescript-eslint/no-explicit-any': 'warn',
      // Unused vars: allow _ prefix convention
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Allow no-useless-escape as warn only
      'no-useless-escape': 'warn',
      // Allow misleading character class as warn
      'no-misleading-character-class': 'warn',
      // Allow exhaustive-deps as warn only  
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
