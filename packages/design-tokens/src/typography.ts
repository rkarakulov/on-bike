import type { font } from './primitives.ts';

export type FontRole = keyof typeof font;

/** Подключённые начертания: токен с другим весом не пройдёт typecheck. */
export const fontWeights = {
  display: [500, 600],
  text: [400, 500, 600, 700],
} as const satisfies Record<FontRole, readonly number[]>;

export type FontWeight<R extends FontRole = FontRole> = (typeof fontWeights)[R][number];

/** Начертание: вес связан с ролью (`display` + 700 — ошибка типа). */
export type FontFace = { [R in FontRole]: { role: R; weight: FontWeight<R> } }[FontRole];

export type TextStyleToken = FontFace & {
  /** px */
  size: number;
  /** px */
  lineHeight: number;
  /** em, как в CSS прототипов */
  letterSpacing?: number;
  uppercase?: boolean;
  /** табличные цифры (время, места, дистанции) */
  tabularNums?: boolean;
};

const display = (
  weight: FontWeight<'display'>,
  size: number,
  lineHeight: number,
  extra: Partial<TextStyleToken> = {},
) => ({ role: 'display', weight, size, lineHeight, ...extra }) as TextStyleToken;

const text = (
  weight: FontWeight<'text'>,
  size: number,
  lineHeight: number,
  extra: Partial<TextStyleToken> = {},
) => ({ role: 'text', weight, size, lineHeight, ...extra }) as TextStyleToken;

const caps = (letterSpacing: number) => ({ letterSpacing, uppercase: true });
const nums = { tabularNums: true };

/** Шкала `.t-*` прототипов (одинакова во всех 19 файлах) + стили веб-панели. */
export const typography = {
  displayNumeral: display(600, 52, 54, { letterSpacing: -0.01, ...nums }),
  displayNumeral44: display(600, 44, 48, { letterSpacing: -0.01, ...nums }),
  displayNumeral36: display(600, 36, 40, { letterSpacing: -0.01, ...nums }),
  displayNumeralDate: display(600, 48, 52, { letterSpacing: -0.01, ...nums }),
  displayTitle: display(500, 28, 34, { letterSpacing: -0.01 }),
  displayStat: display(600, 22, 26, nums),
  displaySm: display(500, 22, 27),
  displayXs: display(600, 18, 22, nums),
  displayBar: display(500, 20, 24),
  brand: display(600, 15, 15, { letterSpacing: 0.18 }),
  surnameCaps: text(600, 34, 38, caps(0.14)),
  time: text(500, 15, 20, nums),
  unit: text(500, 13, 16),
  body: text(400, 15, 22),
  bodyStrong: text(600, 17, 22),
  titleSm: text(600, 15, 20),
  titleSmRead: text(400, 15, 20),
  banner: text(500, 14, 20),
  bannerTitle: text(600, 14, 20),
  meta: text(500, 13, 18),
  metaLg: text(500, 14, 20),
  metaXs: text(500, 11, 14),
  label: text(600, 11, 14, caps(0.14)),
  labelTag: text(500, 11, 14, caps(0.14)),
  labelPhoto: text(600, 13, 16, caps(0.12)),
  button: text(600, 13, 16, caps(0.08)),
  textAction: text(600, 12, 16, caps(0.1)),
  chip: text(600, 12, 16),
  pill: text(600, 11, 16, caps(0.06)),
  tag: text(700, 11, 14, caps(0.08)),
  tabLabel: text(500, 11, 14),
  tabLabelActive: text(600, 11, 14),
  counter: text(700, 11, 18),
  // веб-панель «Протокол»
  panelTitle: display(500, 30, 36, { letterSpacing: -0.01 }),
  panelTitleSm: display(500, 24, 28, { letterSpacing: -0.01 }),
  panelKpi: display(600, 28, 34, nums),
  panelButton: text(600, 11.5, 16, caps(0.08)),
  panelNav: text(500, 13, 20),
  panelCrumb: text(500, 12.5, 18),
  panelTableHead: text(600, 11, 14, caps(0.1)),
} as const satisfies Record<string, TextStyleToken>;

export type TextStyleName = keyof typeof typography;
