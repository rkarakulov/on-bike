/// <reference types="jest" />
import { typography, type TextStyleName } from '@pokatim/design-tokens';
import { textStyle } from '@rkarakulov/ui';

import { fontAssets } from './fonts';

// дизайн-система настроена брендом проекта в jest.setup.ts (src/theme/design-system.ts)
describe('шрифты проекта в дизайн-системе', () => {
  it('каждый стиль typography разрешается в подключённый шрифт', () => {
    for (const name of Object.keys(typography) as TextStyleName[]) {
      expect(Object.keys(fontAssets)).toContain(textStyle(name).fontFamily);
    }
  });

  it('вес — своим файлом: заголовок 500 — Playfair Display Medium, текст 400 — Inter Regular', () => {
    expect(textStyle('displayTitle').fontFamily).toBe('PlayfairDisplay_500Medium');
    expect(textStyle('body').fontFamily).toBe('Inter_400Regular');
  });
});
