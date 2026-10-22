/**
 * Слой 1 — примитивы: сырые значения из CSS прототипов («Воздух», визуальный слой «Ателье»).
 * Компоненты и приложения их не используют напрямую — только через семантику (themes.ts).
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
export const fontStack = {
  display: "'Playfair Display', 'PT Serif', Georgia, 'Times New Roman', serif",
  text: 'Inter, system-ui, Arial, Helvetica, sans-serif',
} as const;

export const space = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 44 } as const;

/** Внутренние отступы контролов из прототипов (вне шкалы space). */
export const inset = {
  /** pill по вертикали */
  xs: 2,
  /** pill по горизонтали */
  sm: 7,
  /** сегмент `.seg span` */
  segment: 9,
  /** подпись рядом со стеком аватаров `.avstack em` */
  caption: 10,
  /** поле, чип, баннер */
  md: 14,
  /** кнопка */
  lg: 18,
} as const;

/** px */
export const size = {
  touchMin: 44,
  gutter: 20,
  sectionGap: 28,
  rowPadding: 18,
  statGap: 12,
  buttonHeight: 48,
  fieldHeight: 52,
  textAreaHeight: 104,
  rowMin: 64,
  heroHeight: 300,
  topBarHeight: 52,
  tabBarHeight: 49,
  chipHeight: 36,
  checkbox: 22,
  toggleWidth: 51,
  toggleHeight: 31,
  toggleThumb: 27,
  avatar: 32,
  avatarTopBar: 30,
  avatarStack: 24,
  /** нахлёст аватаров в стеке */
  avatarOverlap: 7,
  icon: 18,
  iconSm: 14,
  emptyTile: 52,
  /** скелетон короткого значения (слово, число) */
  skeletonWord: 48,
  /** вертикальный отступ `.empty` */
  emptyPadding: 30,
} as const;

/** Толщины линий, px. */
export const stroke = {
  hairline: 1,
  input: 1.5,
  indicator: 2,
  bannerWarning: 2,
  bannerError: 4,
} as const;

/** Эстетика квадратная: скругление — только у тумблера. */
export const radius = {
  none: 0,
  pill: 9999,
} as const;

/** Движение. Пульс скелетона из прототипов: 1 → .6 → 1 за 1,2 с; при reduce motion — статично. */
export const motion = {
  skeletonPulseMs: 1200,
  skeletonMinOpacity: 0.6,
  /** отклик нажатия кнопки (в прототипах статичен — решение реализации) */
  pressedOpacity: 0.8,
} as const;

/** Плотность веб-панели «Протокол». */
export const density = {
  compact: {
    controlHeight: 36,
    controlHeightSm: 26,
    tableRowHeight: 36,
    tableGroupRowHeight: 28,
    sidebarWidth: 224,
    navItemHeight: 36,
    /** ширина рабочей области (макеты панели 1440) */
    contentMaxWidth: 1440,
  },
} as const;
