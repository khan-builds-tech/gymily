// Flat ESLint config (ESLint 9). Shared across the monorepo.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.expo/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // CommonJS tooling config files (Node globals + require()).
    files: ['**/*.config.{js,cjs}', '**/babel.config.js', '**/metro.config.js'],
    languageOptions: { globals: { ...globals.node }, sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // React Native loads static assets via require() — idiomatic, not a smell.
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
