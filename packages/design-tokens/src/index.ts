/**
 * Токены из прототипов («Воздух»): Jersey Aura — светлая тема мобилки,
 * Night Ride — тёмная, Протокол — веб-панель (только светлая, = jerseyAura).
 */
export const palette = {
  jerseyAura: {
    bg: '#FFFFFF',
    ink: '#111111',
    ink2: '#5C5C5C',
    accent: '#C2410C',
    primary: '#111111',
    onPrimary: '#FFFFFF',
    border: '#E2E2DF',
    border2: '#CFCFCB',
    inputBorder: '#8A8A87',
    error: '#B0103A',
    onError: '#FFFFFF',
    disabledBg: '#E2E2DF',
    disabledFg: '#8A8A87',
    focusRing: '#111111',
    map: '#F4F4F2',
    mapLine: '#E2E2DF',
    routeCore: '#111111',
    corridorBand: '#A3A3A3',
  },
  nightRide: {
    bg: '#0E0E0E',
    ink: '#F2F2F0',
    ink2: '#A3A3A3',
    accent: '#FF7A45',
    primary: '#F2F2F0',
    onPrimary: '#0E0E0E',
    border: '#3A3A3A',
    border2: '#474747',
    inputBorder: '#6E6E6E',
    error: '#FF5C8A',
    onError: '#0E0E0E',
    disabledBg: '#2E2E2E',
    disabledFg: '#757575',
    focusRing: '#F2F2F0',
    map: '#1A1A1A',
    mapLine: '#2E2E2E',
    routeCore: '#F2F2F0',
    corridorBand: '#5C5C5C',
  },
} as const;

export type ThemeName = keyof typeof palette;
export type ColorToken = keyof (typeof palette)['jerseyAura'];

export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 44 } as const;

export const size = {
  gutter: 20,
  buttonHeight: 48,
  fieldHeight: 52,
  rowMin: 64,
  heroHeight: 300,
} as const;

export const font = {
  display: 'Playfair Display',
  text: 'Inter',
} as const;

/** CSS custom properties для веба (admin, landing). */
export function toCssVariables(theme: ThemeName): string {
  return Object.entries(palette[theme])
    .map(([token, value]) => `--color-${token}: ${value};`)
    .join('\n');
}
