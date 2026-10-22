import { designSystemCss } from '@on-bike/design-tokens';

/** Переменные темы «Протокол» и классы `.t-*` из пакета — до первого рендера, без ручных копий. */
export function installDesignSystem(
  doc: Pick<Document, 'createElement' | 'head'> = document,
): void {
  const style = doc.createElement('style');
  style.id = 'design-system';
  style.textContent = designSystemCss({ theme: 'protocol' });
  doc.head.prepend(style);
}
