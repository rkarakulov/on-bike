import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { fontAssets } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

// нативный splash держим, пока не загружены шрифты — без мигания системным шрифтом
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    // без шрифтов работаем на системных, но не молча
    if (fontError) console.warn(`Шрифты не загрузились: ${fontError.message}`);
  }, [fontError]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
      <StatusBar style="auto" />
    </>
  );
}
