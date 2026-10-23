// Единый ESLint flat config монорепо (запускается из корня: pnpm lint) — пресет базы app-foundation
import { createEslintConfig } from '@rkarakulov/config/eslint';

export default await createEslintConfig({
  ignores: ['apps/api/drizzle/**', '**/.astro/**'],
  reactNative: ['apps/app/**/*.{ts,tsx,js}'],
  browser: ['apps/admin/**/*.{ts,tsx}'],
  nest: ['apps/api/**/*.ts'],
  // цвета — только роли темы (useTheme / CSS-переменные бренда), палитра — только в темах бренда
  designSystemOnly: ['apps/{app,admin,landing}/src/**/*.{ts,tsx}'],
  paletteModules: ['@rkarakulov/design-tokens'],
});
