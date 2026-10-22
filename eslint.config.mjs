// Единый ESLint flat config для всего монорепо (запускается из корня: pnpm lint)
import js from '@eslint/js';
import expoConfig from 'eslint-config-expo/flat.js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const guardrails = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  'no-console': ['error', { allow: ['warn', 'error'] }],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/.astro/**',
      '**/coverage/**',
      'apps/api/drizzle/**',
      'apps/mobile/expo-env.d.ts',
      '.claude/**',
      '.agents/**',
      '.codex/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: guardrails,
  },
  {
    files: ['apps/admin/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  ...expoConfig.map((config) => ({ ...config, files: ['apps/mobile/**/*.{ts,tsx,js}'] })),
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    // резолв модулей проверяет tsc (с условием @on-bike/source), import-плагин его не знает
    rules: { 'import/no-unresolved': 'off' },
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      // NestJS DI опирается на runtime-импорты классов
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
