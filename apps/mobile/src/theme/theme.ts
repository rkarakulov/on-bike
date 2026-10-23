import { palette } from '@on-bike/design-tokens';
import { type ColorSchemeName, useColorScheme } from 'react-native';

export type Theme = (typeof palette)['jerseyAura'] | (typeof palette)['nightRide'];

/** Светлая Jersey Aura по умолчанию; Night Ride — только при тёмной системной теме. */
export function themeFor(scheme: ColorSchemeName | null | undefined): Theme {
  return scheme === 'dark' ? palette.nightRide : palette.jerseyAura;
}

export function useTheme(): Theme {
  return themeFor(useColorScheme());
}
