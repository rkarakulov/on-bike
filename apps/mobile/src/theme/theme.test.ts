/// <reference types="jest" />
import { themes, typography, type TextStyleName } from '@on-bike/design-tokens';

import { fontAssets, fontFamilyFor, textStyle } from './fonts';
import { themeFor } from './theme';

describe('themeFor', () => {
  it('тёмная схема → Night Ride, иначе Jersey Aura', () => {
    expect(themeFor('dark')).toBe(themes.dark);
    expect(themeFor('light')).toBe(themes.light);
    expect(themeFor(null)).toBe(themes.light);
  });
});

describe('fonts', () => {
  it('вес выбирает отдельный файл шрифта (Android не синтезирует начертания)', () => {
    expect(fontFamilyFor({ role: 'display', weight: 500 })).toBe('PlayfairDisplay_500Medium');
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

  it('заголовок раздела — Playfair 500 28/34 с трекингом −0.01em', () => {
    expect(textStyle('displayTitle')).toEqual({
      fontFamily: 'PlayfairDisplay_500Medium',
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.28,
    });
  });

  it('метка: em → px, uppercase', () => {
    expect(textStyle('label')).toMatchObject({
      letterSpacing: 11 * 0.14,
      textTransform: 'uppercase',
    });
  });

  it('числа — табличные цифры', () => {
    expect(textStyle('displayNumeral').fontVariant).toEqual(['lining-nums', 'tabular-nums']);
  });
});
