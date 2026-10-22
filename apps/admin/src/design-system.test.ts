import { describe, expect, it, vi } from 'vitest';

import { installDesignSystem } from './design-system';

describe('installDesignSystem', () => {
  it('добавляет стиль темы «Протокол» первым в head', () => {
    const style = { id: '', textContent: '' };
    const prepend = vi.fn();
    const doc = { createElement: () => style, head: { prepend } } as unknown as Document;

    installDesignSystem(doc);

    expect(prepend).toHaveBeenCalledWith(style);
    expect(style.id).toBe('design-system');
    expect(style.textContent).toContain('--nav-background: #111111;');
    expect(style.textContent).toContain('.t-panel-title {');
  });
});
