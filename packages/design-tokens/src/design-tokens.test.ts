import { describe, expect, it } from 'vitest';

import { contrastPairs, contrastRatio, WCAG } from './contrast.ts';
import { cssVariables, designSystemCss, typographyCss } from './css.ts';
import { themes, type ThemeName } from './themes.ts';
import { typography } from './typography.ts';

/** CSS-переменные прототипов (`:root,[data-theme=light]` / `[data-theme=dark]`) → семантические роли. */
const prototype: Record<'light' | 'dark', Record<string, [string, string]>> = {
  light: {
    '--bg': ['surface.default', '#FFFFFF'],
    '--surface': ['surface.raised', '#F4F4F2'],
    '--ink': ['text.primary', '#111111'],
    '--ink-2': ['text.secondary', '#5C5C5C'],
    '--primary': ['action.primary', '#111111'],
    '--on-primary': ['action.onPrimary', '#FFFFFF'],
    '--accent': ['text.accent', '#C2410C'],
    '--border': ['border.subtle', '#E2E2DF'],
    '--border-2': ['border.strong', '#CFCFCB'],
    '--success': ['status.success', '#1E7A46'],
    '--warning': ['status.warning', '#866C00'],
    '--error': ['status.error', '#B0103A'],
    '--input-border': ['border.input', '#8A8A87'],
    '--input-placeholder': ['text.placeholder', '#5C5C5C'],
    '--focus-ring': ['border.focus', '#111111'],
    '--disabled-bg': ['surface.disabled', '#E2E2DF'],
    '--disabled-fg': ['text.disabled', '#8A8A87'],
    '--map': ['map.background', '#F4F4F2'],
    '--route-core': ['map.route', '#111111'],
    '--corridor-band': ['map.corridor', '#5C5C5C'],
    '--surface-gravel': ['surfaceBar.gravel', '#E2E2DF'],
    '--sheet-bg': ['surface.sheet', '#FFFFFF'],
  },
  dark: {
    '--bg': ['surface.default', '#0E0E0E'],
    '--surface': ['surface.raised', '#1A1A1A'],
    '--ink': ['text.primary', '#F2F2F0'],
    '--ink-2': ['text.secondary', '#A3A3A3'],
    '--on-primary': ['action.onPrimary', '#0E0E0E'],
    '--accent': ['text.accent', '#FF7A45'],
    '--border': ['border.subtle', '#3A3A3A'],
    '--success': ['status.success', '#4CC28A'],
    '--warning': ['status.warning', '#F0CC3C'],
    '--error': ['status.error', '#FF5C8A'],
    '--input-border': ['border.input', '#6E6E6E'],
    '--disabled-fg': ['text.disabled', '#757575'],
    '--corridor-band': ['map.corridor', '#A3A3A3'],
    '--sheet-bg': ['surface.sheet', '#1A1A1A'],
    '--sheet-rule': ['border.sheet', '#474747'],
    '--primary': ['action.primary', '#F2F2F0'],
    '--border-2': ['border.strong', '#474747'],
    '--focus-ring': ['border.focus', '#F2F2F0'],
    '--disabled-bg': ['surface.disabled', '#2E2E2E'],
    '--map': ['map.background', '#1A1A1A'],
    '--route-core': ['map.route', '#F2F2F0'],
    '--surface-gravel': ['surfaceBar.gravel', '#2E2E2E'],
  },
};

const get = (themeName: ThemeName, path: string) =>
  path
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], themes[themeName]);

describe('семантика совпадает с CSS прототипов', () => {
  for (const themeName of ['light', 'dark'] as const) {
    for (const [cssVar, [role, value]] of Object.entries(prototype[themeName])) {
      it(`${themeName}: ${cssVar} → ${role}`, () => expect(get(themeName, role)).toBe(value));
    }
  }

  it('protocol = светлая семантика + тёмная навигация', () => {
    const { nav, ...roles } = themes.protocol;
    expect(roles).toEqual(themes.light);
    expect(nav).toMatchObject({
      background: '#111111',
      text: '#CFCFCB',
      activeBackground: '#1A1A1A',
    });
  });
});

describe('контраст WCAG', () => {
  it('contrastRatio: чёрный на белом = 21, одинаковые = 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrastRatio('#5C5C5C', '#5C5C5C')).toBe(1);
  });

  for (const themeName of Object.keys(themes) as ThemeName[]) {
    it.each(contrastPairs(themeName))(
      `${themeName}: $name ≥ $min`,
      ({ foreground, background, min }) => {
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(min);
      },
    );
  }

  it('пороги: текст 4.5, UI 3', () => expect(WCAG).toEqual({ text: 4.5, ui: 3 }));
});

describe('типографика', () => {
  it('заголовок раздела — Playfair 500 28/34, вкладки 500 / 600', () => {
    expect(typography.displayTitle).toMatchObject({
      role: 'display',
      weight: 500,
      size: 28,
      lineHeight: 34,
    });
    expect(typography.tabLabel.weight).toBe(500);
    expect(typography.tabLabelActive.weight).toBe(600);
  });
});

describe('CSS для веба', () => {
  it('классы .t-* в формате прототипов', () => {
    const css = typographyCss();
    expect(css).toContain(
      '.t-display-title { font: 500 28px/34px var(--font-display); letter-spacing: -0.01em; }',
    );
    expect(css).toContain(
      '.t-label { font: 600 11px/14px var(--font-text); letter-spacing: 0.14em; text-transform: uppercase; }',
    );
    expect(css).toContain('.t-display-numeral-44 {');
  });

  it('переменные темы: семантика, навигация только у protocol', () => {
    expect(cssVariables('light')).toContain('--color-text-primary: #111111;');
    expect(cssVariables('dark')).toContain('--color-text-primary: #F2F2F0;');
    expect(cssVariables('protocol')).toContain('--nav-background: #111111;');
    expect(cssVariables('light')).not.toContain('--nav-');
    expect(cssVariables('light')).toContain('--size-touch-min: 44px;');
    expect(cssVariables('light')).toContain('--inset-lg: 18px;');
    expect(cssVariables('light')).toContain('--stroke-input: 1.5px;');
  });

  it('плотность — только у темы protocol', () => {
    expect(cssVariables('protocol')).toContain('--density-control-height: 36px;');
    expect(cssVariables('protocol')).toContain('--density-sidebar-width: 224px;');
    expect(cssVariables('light')).not.toContain('--density-');
  });

  it('скелетон: роль surface.skeleton, пульс 1.2 с, статичный при reduce motion', () => {
    const css = designSystemCss({ theme: 'light' });
    expect(css).toContain('--color-surface-skeleton: #F4F4F2;');
    expect(css).toContain('animation: skeleton-pulse 1200ms ease-in-out infinite;');
    expect(css).toContain(
      '@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }',
    );
  });

  it('тёмная тема подключается через prefers-color-scheme', () => {
    const css = designSystemCss({ theme: 'light', darkTheme: 'dark' });
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\) \{\s*:root \{[^}]*--color-surface-default: #0E0E0E;/,
    );
  });
});
