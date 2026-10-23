/// <reference types="jest" />
import { typography, type TextStyleName } from '@on-bike/design-tokens';
import { textStyle } from '@rkarakulov/ui';

import { fontAssets } from './fonts';

// дизайн-система настроена брендом on-bike в jest.setup.ts (src/theme/design-system.ts)
describe('шрифты on-bike в дизайн-системе', () => {
  it('каждый стиль typography разрешается в подключённый шрифт', () => {
    for (const name of Object.keys(typography) as TextStyleName[]) {
      expect(Object.keys(fontAssets)).toContain(textStyle(name).fontFamily);
    }
  });

  it('акцидентный 500 — Playfair Display Medium, текст 400 — Inter Regular', () => {
    expect(textStyle('displayTitle').fontFamily).toBe('PlayfairDisplay_500Medium');
    expect(textStyle('body').fontFamily).toBe('Inter_400Regular');
  });
});
