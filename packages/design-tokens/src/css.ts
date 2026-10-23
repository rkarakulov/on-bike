import { designSystemCss as baseDesignSystemCss } from '@rkarakulov/design-tokens';

import { fontStack } from './primitives.ts';
import { themes, type ThemeName } from './themes.ts';

export { skeletonCss, typographyCss } from '@rkarakulov/design-tokens';

export interface DesignSystemCssOptions {
  theme: ThemeName;
  /** тема для `prefers-color-scheme: dark` */
  darkTheme?: ThemeName;
}

/**
 * Готовая таблица стилей для веба с брендом on-bike: переменные темы + типографика + скелетон.
 * Плотность (кнопки и строки таблиц 36 px, навигация 224 px) — часть темы «Протокол».
 */
export function designSystemCss({ theme, darkTheme }: DesignSystemCssOptions): string {
  return baseDesignSystemCss({ themes, theme, darkTheme, fontStack, dense: theme === 'protocol' });
}
