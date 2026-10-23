/**
 * Дизайн-система on-bike. Слой 1 — примитивы (`primitives.ts`), слой 2 — семантика (`themes.ts`).
 * Приложения используют семантику, типографику и размеры; примитивы — только внутри пакета и в тестах.
 */
export {
  color,
  density,
  font,
  fontStack,
  inset,
  motion,
  radius,
  size,
  space,
  stroke,
} from './primitives.ts';
export { themes, type ColorRoles, type NavRoles, type Theme, type ThemeName } from './themes.ts';
export {
  fontWeights,
  typography,
  type FontFace,
  type FontRole,
  type FontWeight,
  type TextStyleName,
  type TextStyleToken,
} from './typography.ts';
export { contrastPairs, contrastRatio, WCAG, type ContrastPair } from './contrast.ts';
export { cssVariables, designSystemCss, skeletonCss, typographyCss } from './css.ts';
