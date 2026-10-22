import { density, fontStack, inset, motion, radius, size, space, stroke } from './primitives.ts';
import { themes, type ThemeName } from './themes.ts';
import { typography } from './typography.ts';

const kebab = (s: string) =>
  s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`).replace(/\d+/g, (d) => `-${d}`);

function flatten(prefix: string, value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(`${prefix}: ${value};`);
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    flatten(`${prefix}-${kebab(key)}`, nested, out);
  }
}

/** Custom properties темы: `--color-text-primary`, `--nav-background`, … */
export function cssVariables(themeName: ThemeName): string {
  const { nav, ...roles } = themes[themeName] as (typeof themes)[ThemeName] & { nav?: object };
  const out: string[] = [];
  flatten('--color', roles, out);
  if (nav) flatten('--nav', nav, out);
  out.push(`--font-display: ${fontStack.display};`, `--font-text: ${fontStack.text};`);
  for (const [key, value] of Object.entries(space)) out.push(`--space-${key}: ${value}px;`);
  const px = (prefix: string, values: Record<string, number>) => {
    for (const [key, value] of Object.entries(values))
      out.push(`--${prefix}-${kebab(key)}: ${value}px;`);
  };
  px('size', size);
  px('inset', inset);
  px('stroke', stroke);
  px('radius', radius);
  // плотность — часть темы «Протокол» (кнопки и строки таблиц 36 px, навигация 224 px)
  if (themeName === 'protocol') px('density', density.compact);
  out.push(`color-scheme: ${themeName === 'dark' ? 'dark' : 'light'};`);
  return out.join('\n  ');
}

/** Классы `.t-*` — те же имена, что в прототипах (`displayTitle` → `.t-display-title`). */
export function typographyCss(): string {
  return Object.entries(typography)
    .map(([name, t]) => {
      const family = t.role === 'display' ? 'var(--font-display)' : 'var(--font-text)';
      const rules = [`font: ${t.weight} ${t.size}px/${t.lineHeight}px ${family};`];
      if (t.letterSpacing !== undefined) rules.push(`letter-spacing: ${t.letterSpacing}em;`);
      if (t.uppercase) rules.push('text-transform: uppercase;');
      if (t.tabularNums) rules.push('font-variant-numeric: lining-nums tabular-nums;');
      return `.t-${kebab(name)} { ${rules.join(' ')} }`;
    })
    .join('\n');
}

/** `.skeleton` — блок загрузки с пульсом; при `prefers-reduced-motion` — статичный. */
export function skeletonCss(): string {
  const { skeletonPulseMs, skeletonMinOpacity } = motion;
  return [
    '.skeleton { background: var(--color-surface-skeleton); color: transparent; user-select: none; ' +
      `animation: skeleton-pulse ${skeletonPulseMs}ms ease-in-out infinite; }`,
    `@keyframes skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: ${skeletonMinOpacity}; } }`,
    '@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }',
  ].join('\n');
}

interface DesignSystemCssOptions {
  theme: ThemeName;
  /** тема для `prefers-color-scheme: dark` */
  darkTheme?: ThemeName;
}

/** Готовая таблица стилей для веба: переменные темы + типографика. */
export function designSystemCss({ theme, darkTheme }: DesignSystemCssOptions): string {
  const blocks = [`:root {\n  ${cssVariables(theme)}\n}`];
  if (darkTheme) {
    blocks.push(
      `@media (prefers-color-scheme: dark) {\n  :root {\n  ${cssVariables(darkTheme)}\n  }\n}`,
    );
  }
  blocks.push(typographyCss(), skeletonCss());
  return blocks.join('\n');
}
