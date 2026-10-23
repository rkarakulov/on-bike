import { color as c } from './primitives.ts';

/**
 * Слой 2 — семантика: роли, а не цвета. Компоненты знают только роли;
 * значение роли в каждой теме — из CSS прототипов.
 */
export interface ColorRoles {
  text: {
    primary: string;
    secondary: string;
    accent: string;
    onPrimary: string;
    /** текст поверх фото через скрим */
    onPhoto: string;
    placeholder: string;
    disabled: string;
  };
  surface: {
    default: string;
    raised: string;
    sheet: string;
    disabled: string;
    /** блоки скелетона загрузки (`.skel` прототипов = surface). Ставится на surface.default:
     *  на surface.raised совпадает с фоном — внутри карточек скелетон рисуется сразу вместо карточки. */
    skeleton: string;
  };
  border: {
    subtle: string;
    strong: string;
    input: string;
    focus: string;
    sheet: string;
  };
  action: {
    primary: string;
    onPrimary: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    onError: string;
    errorTint: string;
  };
  map: {
    background: string;
    line: string;
    route: string;
    corridor: string;
  };
  surfaceBar: {
    asphalt: string;
    gravel: string;
    gravelHatch: string;
    outline: string;
  };
  overlay: {
    scrim: string;
  };
  /** тумблер */
  control: {
    track: string;
    trackOn: string;
    thumb: string;
    thumbOn: string;
  };
}

/** Тёмная боковая навигация веб-панели. */
export interface NavRoles {
  background: string;
  text: string;
  textMuted: string;
  activeBackground: string;
  activeText: string;
  activeIndicator: string;
  focus: string;
}

const light: ColorRoles = {
  text: {
    primary: c.neutral900,
    secondary: c.neutral600,
    accent: c.orange600,
    onPrimary: c.neutral0,
    onPhoto: c.neutral0,
    placeholder: c.neutral600,
    disabled: c.neutral450,
  },
  surface: {
    default: c.neutral0,
    raised: c.neutral25,
    sheet: c.neutral0,
    disabled: c.neutral100,
    skeleton: c.neutral25,
  },
  border: {
    subtle: c.neutral100,
    strong: c.neutral200,
    input: c.neutral450,
    focus: c.neutral900,
    sheet: c.neutral100,
  },
  action: { primary: c.neutral900, onPrimary: c.neutral0 },
  status: {
    success: c.green700,
    warning: c.yellow700,
    error: c.red700,
    onError: c.neutral0,
    errorTint: c.red50,
  },
  map: {
    background: c.neutral25,
    line: c.neutral100,
    route: c.neutral900,
    corridor: c.neutral600,
  },
  surfaceBar: {
    asphalt: c.neutral900,
    gravel: c.neutral100,
    gravelHatch: c.neutral900,
    outline: c.neutral600,
  },
  overlay: { scrim: c.black },
  // дорожка выкл. — как border.input, а не #CFCFCB прототипа: иначе 1.56:1 < 3:1 (WCAG 1.4.11)
  control: { track: c.neutral450, trackOn: c.neutral900, thumb: c.neutral0, thumbOn: c.neutral0 },
};

const dark: ColorRoles = {
  text: {
    primary: c.neutral50,
    secondary: c.neutral400,
    accent: c.orange400,
    onPrimary: c.neutral950,
    onPhoto: c.neutral0,
    placeholder: c.neutral400,
    disabled: c.neutral500,
  },
  surface: {
    default: c.neutral950,
    raised: c.neutral850,
    sheet: c.neutral850,
    disabled: c.neutral800,
    skeleton: c.neutral850,
  },
  border: {
    subtle: c.neutral750,
    strong: c.neutral700,
    input: c.neutral550,
    focus: c.neutral50,
    sheet: c.neutral700,
  },
  action: { primary: c.neutral50, onPrimary: c.neutral950 },
  status: {
    success: c.green400,
    warning: c.yellow400,
    error: c.red400,
    onError: c.neutral950,
    // в прототипах тёмного варианта нет (используется только в светлой веб-панели)
    errorTint: c.neutral850,
  },
  map: {
    background: c.neutral850,
    line: c.neutral800,
    route: c.neutral50,
    corridor: c.neutral400,
  },
  surfaceBar: {
    asphalt: c.neutral50,
    gravel: c.neutral800,
    gravelHatch: c.neutral50,
    outline: c.neutral400,
  },
  overlay: { scrim: c.black },
  // дорожка выкл. — как border.input, а не #474747 прототипа (WCAG 1.4.11)
  control: { track: c.neutral550, trackOn: c.neutral50, thumb: c.neutral0, thumbOn: c.neutral950 },
};

const protocolNav: NavRoles = {
  background: c.neutral900,
  text: c.neutral200,
  textMuted: c.neutral400,
  activeBackground: c.neutral850,
  activeText: c.neutral0,
  activeIndicator: c.neutral0,
  focus: c.neutral50,
};

/**
 * Jersey Aura — светлая мобилки и лендинга, Night Ride — тёмная,
 * Протокол — веб-панель: светлая семантика + тёмная навигация (+ плотность из primitives.density).
 */
export const themes = {
  light,
  dark,
  protocol: { ...light, nav: protocolNav },
} as const satisfies Record<string, Theme>;

export type ThemeName = keyof typeof themes;
export type Theme = ColorRoles & { nav?: NavRoles };
