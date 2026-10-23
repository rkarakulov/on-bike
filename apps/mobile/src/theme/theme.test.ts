/// <reference types="jest" />
import { palette, typography, type TextStyleName } from '@on-bike/design-tokens';

import { fontAssets, fontFamilyFor, textStyle } from './fonts';
import { themeFor } from './theme';

describe('themeFor', () => {
  it('тёмная схема → Night Ride, иначе Jersey Aura', () => {
    expect(themeFor('dark')).toBe(palette.nightRide);
    expect(themeFor('light')).toBe(palette.jerseyAura);
    expect(themeFor(null)).toBe(palette.jerseyAura);
  });
});

describe('fonts', () => {
  it('вес выбирает отдельный файл шрифта (Android не синтезирует начертания)', () => {
    expect(fontFamilyFor({ role: 'display', weight: 600 })).toBe('PlayfairDisplay_600SemiBold');
    expect(fontFamilyFor({ role: 'text', weight: 400 })).toBe('Inter_400Regular');
    expect(fontFamilyFor({ role: 'text', weight: 700 })).toBe('Inter_700Bold');
    // @ts-expect-error Playfair 700 не подключён — токен с таким весом не скомпилируется
    void fontFamilyFor({ role: 'display', weight: 700 });
  });

  it('каждый стиль typography разрешается в подключённый шрифт', () => {
    for (const name of Object.keys(typography) as TextStyleName[]) {
      expect(Object.keys(fontAssets)).toContain(textStyle(name).fontFamily);
    }
  });

  it('textStyle собирает fontFamily, размер и межстрочный из токенов', () => {
    expect(textStyle('title')).toEqual({
      fontFamily: 'PlayfairDisplay_600SemiBold',
      fontSize: 28,
      lineHeight: 34,
    });
  });
});
