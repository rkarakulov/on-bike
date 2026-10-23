import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import type { FontRole, FontWeight } from '@on-bike/design-tokens';

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

/**
 * Семейства для `configureDesignSystem` (тип `FontFamilies` базы): у каждой роли — ровно её веса
 * из design-tokens, имена — только подключённые файлы `fontAssets`.
 */
export const fontFamilies: { [R in FontRole]: Record<FontWeight<R>, FontFamily> } = {
  display: { 500: 'PlayfairDisplay_500Medium', 600: 'PlayfairDisplay_600SemiBold' },
  text: {
    400: 'Inter_400Regular',
    500: 'Inter_500Medium',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
  },
};
