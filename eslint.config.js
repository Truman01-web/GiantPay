import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'public/mockServiceWorker.js', 'server/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat['recommended-latest'], jsxA11y.flatConfigs.recommended, prettierConfig],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'jsx-a11y/no-autofocus': 'off',
      // Our shared form controls (components/ui, components/forms) wrap
      // native inputs — register them so implicit `<label>...control</label>`
      // nesting is recognized the same way it would be for a plain <input>.
      'jsx-a11y/label-has-associated-control': [
        'error',
        {
          controlComponents: ['Input', 'PasswordInput', 'Textarea', 'PhoneInput', 'CurrencyInput', 'Checkbox', 'RadioGroupItem', 'Switch'],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/tests/**', 'e2e/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
