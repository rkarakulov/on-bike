import { designSystemCss as baseDesignSystemCss } from '@rkarakulov/design-tokens';

import { fontStack, themes, type ThemeName } from './brand.ts';

export { skeletonCss, typographyCss } from '@rkarakulov/design-tokens';

export interface DesignSystemCssOptions {
  theme: ThemeName;
  /** тема для `prefers-color-scheme: dark` */
  darkTheme?: ThemeName;
}

/**
 * Готовая таблица стилей для веба с брендом проекта: переменные темы + типографика + скелетон.
 * Плотность веб-панели (кнопки и строки таблиц 36 px, навигация 224 px) — часть темы `panel`.
 */
export function designSystemCss({ theme, darkTheme }: DesignSystemCssOptions): string {
  return baseDesignSystemCss({ themes, theme, darkTheme, fontStack, dense: theme === 'panel' });
}
