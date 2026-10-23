import {
  contrastPair,
  contrastPairs as baseContrastPairs,
  WCAG,
  type ContrastPair,
} from '@rkarakulov/design-tokens';

import { themes, type ThemeName } from './brand.ts';

export { contrastRatio, WCAG, type ContrastPair } from '@rkarakulov/design-tokens';

/**
 * Пары, которые реально встречаются в компонентах темы. Свои группы ролей бренда добавляйте
 * парами `contrastPair('group.role / group.background', …)` из базы — их проверит тот же тест.
 */
export function contrastPairs(themeName: ThemeName): ContrastPair[] {
  const t = themes[themeName];
  return [
    ...baseContrastPairs(t),
    // карта маршрута on-bike
    contrastPair('map.route / map.background', t.map.route, t.map.background, WCAG.ui),
    contrastPair('map.corridor / map.background', t.map.corridor, t.map.background, WCAG.ui),
  ];
}
