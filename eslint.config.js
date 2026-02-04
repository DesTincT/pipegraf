import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const tsFiles = ['**/*.ts', '**/*.tsx'];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.js', 'examples/**'],
  },
  js.configs.recommended,
  prettier,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: tsFiles,
  })),
  ...tseslint.configs.stylistic.map((config) => ({
    ...config,
    files: tsFiles,
  })),
  {
    files: tsFiles,
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
