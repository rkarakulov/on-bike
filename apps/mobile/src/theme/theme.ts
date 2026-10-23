import { type ColorRoles, themes } from '@on-bike/design-tokens';
import { type ColorSchemeName, useColorScheme } from 'react-native';

/** Семантические роли цвета; примитивы компонентам недоступны. */
export type Theme = ColorRoles;

/** Светлая Jersey Aura по умолчанию; Night Ride — только при тёмной системной теме. */
export function themeFor(scheme: ColorSchemeName | null | undefined): Theme {
  return scheme === 'dark' ? themes.dark : themes.light;
}

export function useTheme(): Theme {
  return themeFor(useColorScheme());
}
