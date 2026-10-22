/**
 * Дизайн-система on-bike поверх базы `@rkarakulov/design-tokens`: бренд (палитра, гарнитуры, темы
 * Jersey Aura / Night Ride / «Протокол», группы ролей `map` и `surfaceBar`) + структурные токены базы.
 * Приложения используют семантику, типографику и размеры; палитра `color` — только внутри пакета и в тестах.
 * Реэкспорт базы — только явный: у базы `contrastPairs`/`designSystemCss` с другими сигнатурами.
 */
export {
  density,
  fontWeights,
  inset,
  motion,
  radius,
  size,
  space,
  stroke,
  typography,
  type FontFace,
  type FontRole,
  type FontWeight,
  type TextStyleName,
  type TextStyleToken,
} from '@rkarakulov/design-tokens';
export { color, font, fontStack } from './primitives.ts';
export {
  themes,
  type ColorRoles,
  type NavRoles,
  type OnBikeRoleGroups,
  type OnBikeTheme,
  type Theme,
  type ThemeName,
} from './themes.ts';
export { contrastPairs, contrastRatio, WCAG, type ContrastPair } from './contrast.ts';
export { designSystemCss, skeletonCss, typographyCss, type DesignSystemCssOptions } from './css.ts';
