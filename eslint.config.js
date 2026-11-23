import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'vscode-extension/dist', 'vscode-extension/out', 'vscode-extension/node_modules', 'node_modules', 'coverage', 'test-results', 'playwright-report'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // 規約（development-guidelines 1.4）の自動確認に使うのは、この 2 つだけ。React Compiler 向けの規則は対象外
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // 拡張機能ホスト（Node 上で動く。React の規則は使わない）
    files: ['vscode-extension/src/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  {
    // E2E テスト（Playwright。Node 上で動く）
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  }
);
