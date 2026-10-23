import type { FontStack } from '@rkarakulov/design-tokens';

/**
 * Слой 1 — бренд on-bike: палитра и гарнитуры из CSS прототипов («Воздух», визуальный слой «Ателье»).
 * Структурные шкалы (`space`, `size`, `inset`, …) — из базы `@rkarakulov/design-tokens`.
 * Компоненты и приложения палитру напрямую не используют — только через семантику (themes.ts).
 */
export const color = {
  neutral0: '#FFFFFF',
  neutral25: '#F4F4F2',
  neutral50: '#F2F2F0',
  neutral100: '#E2E2DF',
  neutral200: '#CFCFCB',
  neutral400: '#A3A3A3',
  neutral450: '#8A8A87',
  neutral500: '#757575',
  neutral550: '#6E6E6E',
  neutral600: '#5C5C5C',
  neutral700: '#474747',
  neutral750: '#3A3A3A',
  neutral800: '#2E2E2E',
  neutral850: '#1A1A1A',
  neutral900: '#111111',
  neutral950: '#0E0E0E',
  black: '#000000',
  orange600: '#C2410C',
  orange400: '#FF7A45',
  red700: '#B0103A',
  red400: '#FF5C8A',
  red50: '#FBEDEB',
  green700: '#1E7A46',
  green400: '#4CC28A',
  yellow700: '#866C00',
  yellow400: '#F0CC3C',
} as const;

export const font = {
  display: 'Playfair Display',
  text: 'Inter',
} as const;

/** Стеки с фолбэками для веба. */
export const fontStack: FontStack = {
  display: "'Playfair Display', 'PT Serif', Georgia, 'Times New Roman', serif",
  text: 'Inter, system-ui, Arial, Helvetica, sans-serif',
};
