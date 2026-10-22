import {
  contrastPair,
  contrastPairs as baseContrastPairs,
  WCAG,
  type ContrastPair,
} from '@rkarakulov/design-tokens';

import { themes, type Theme, type ThemeName } from './themes.ts';

export { contrastRatio, WCAG, type ContrastPair } from '@rkarakulov/design-tokens';

/** Пары, которые реально встречаются в компонентах темы: пары базы + карта on-bike. */
export function contrastPairs(themeName: ThemeName): ContrastPair[] {
  const t: Theme = themes[themeName];
  return [
    ...baseContrastPairs(t),
    contrastPair('map.route / map.background', t.map.route, t.map.background, WCAG.ui),
    contrastPair('map.corridor / map.background', t.map.corridor, t.map.background, WCAG.ui),
  ];
}
