import { themes, type Theme, type ThemeName } from './themes.ts';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Контраст WCAG 2.x для двух непрозрачных цветов `#RRGGBB`. */
export function contrastRatio(foreground: string, background: string): number {
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** WCAG 1.4.3 — обычный текст; 1.4.11 — границы и состояния UI. Disabled — исключение по 1.4.3. */
export const WCAG = { text: 4.5, ui: 3 } as const;

export interface ContrastPair {
  name: string;
  foreground: string;
  background: string;
  min: number;
}

/** Пары, которые реально встречаются в компонентах темы. */
export function contrastPairs(themeName: ThemeName): ContrastPair[] {
  const t: Theme = themes[themeName];
  const pair = (name: string, foreground: string, background: string, min: number) => ({
    name,
    foreground,
    background,
    min,
  });

  const pairs = [
    pair('text.primary / surface.default', t.text.primary, t.surface.default, WCAG.text),
    pair('text.primary / surface.raised', t.text.primary, t.surface.raised, WCAG.text),
    pair('text.secondary / surface.default', t.text.secondary, t.surface.default, WCAG.text),
    pair('text.secondary / surface.raised', t.text.secondary, t.surface.raised, WCAG.text),
    pair('text.accent / surface.default', t.text.accent, t.surface.default, WCAG.text),
    pair('text.placeholder / surface.default', t.text.placeholder, t.surface.default, WCAG.text),
    pair('action.onPrimary / action.primary', t.action.onPrimary, t.action.primary, WCAG.text),
    pair('status.error / surface.default', t.status.error, t.surface.default, WCAG.text),
    pair('status.warning / surface.raised', t.status.warning, t.surface.raised, WCAG.text),
    pair('status.success / surface.default', t.status.success, t.surface.default, WCAG.text),
    pair('status.onError / status.error', t.status.onError, t.status.error, WCAG.text),
    pair('status.error / status.errorTint', t.status.error, t.status.errorTint, WCAG.text),
    pair('border.input / surface.default', t.border.input, t.surface.default, WCAG.ui),
    pair('border.focus / surface.default', t.border.focus, t.surface.default, WCAG.ui),
    pair('map.route / map.background', t.map.route, t.map.background, WCAG.ui),
    pair('map.corridor / map.background', t.map.corridor, t.map.background, WCAG.ui),
    pair('control.track / surface.default', t.control.track, t.surface.default, WCAG.ui),
    pair('control.thumb / control.track', t.control.thumb, t.control.track, WCAG.ui),
    pair('control.trackOn / surface.default', t.control.trackOn, t.surface.default, WCAG.ui),
    pair('control.thumbOn / control.trackOn', t.control.thumbOn, t.control.trackOn, WCAG.ui),
  ];

  if (t.nav) {
    pairs.push(
      pair('nav.text / nav.background', t.nav.text, t.nav.background, WCAG.text),
      pair('nav.textMuted / nav.background', t.nav.textMuted, t.nav.background, WCAG.text),
      pair(
        'nav.activeText / nav.activeBackground',
        t.nav.activeText,
        t.nav.activeBackground,
        WCAG.text,
      ),
      pair('nav.focus / nav.background', t.nav.focus, t.nav.background, WCAG.ui),
    );
  }
  return pairs;
}
