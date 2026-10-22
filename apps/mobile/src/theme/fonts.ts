import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import {
  type FontFace,
  type FontRole,
  type FontWeight,
  typography,
  type TextStyleName,
  type TextStyleToken,
} from '@on-bike/design-tokens';
import type { TextStyle } from 'react-native';

/** Подключаем только нужные начертания: импорт из корня пакета тянет в бандл все 18 файлов. */
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
};

type FontFamily = keyof typeof fontAssets;

// полнота по типу: у каждой роли — ровно её подключённые веса из design-tokens
const families: { [R in FontRole]: Record<FontWeight<R>, FontFamily> } = {
  display: { 500: 'PlayfairDisplay_500Medium', 600: 'PlayfairDisplay_600SemiBold' },
  text: {
    400: 'Inter_400Regular',
    500: 'Inter_500Medium',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
  },
};

/** Android не синтезирует начертание по fontWeight — у каждого веса свой fontFamily. */
export function fontFamilyFor(face: FontFace): FontFamily {
  return face.role === 'display' ? families.display[face.weight] : families.text[face.weight];
}

/** Стиль текста из токена: em → px, uppercase и табличные цифры — как в CSS прототипов. */
export function textStyle(name: TextStyleName): TextStyle {
  const token: TextStyleToken = typography[name];
  return {
    fontFamily: fontFamilyFor(token),
    fontSize: token.size,
    lineHeight: token.lineHeight,
    ...(token.letterSpacing ? { letterSpacing: token.letterSpacing * token.size } : {}),
    ...(token.uppercase ? { textTransform: 'uppercase' as const } : {}),
    ...(token.tabularNums ? { fontVariant: ['lining-nums', 'tabular-nums'] as const } : {}),
  };
}
