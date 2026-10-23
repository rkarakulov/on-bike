// дизайн-система (бренд, шрифты, i18n on-bike) — до любого модуля, который рендерит компоненты базы
import '@/theme/design-system';
import { useTheme } from '@rkarakulov/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useRegistrationStore } from '@/features/auth/registration-store';
import { isSignedIn, useSessionStore } from '@/features/auth/session-store';
import { connectOnlineManager } from '@/lib/online-manager';
import { createQueryClient } from '@/lib/query-client';
import { fontAssets } from '@/theme/fonts';

// нативный splash держим, пока не загружены шрифты и не прочитана сессия — без мигания экраном входа
void SplashScreen.preventAutoHideAsync();
connectOnlineManager();

export default function RootLayout() {
  const theme = useTheme();
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const sessionStatus = useSessionStore((state) => state.status);
  const signedIn = useSessionStore((state) => isSignedIn(state));
  const registrationHydrated = useRegistrationStore((state) => state.hydrated);
  const ready =
    (fontsLoaded || fontError !== null) && sessionStatus !== 'unknown' && registrationHydrated;

  useEffect(() => {
    void useSessionStore.getState().hydrate();
    void useRegistrationStore.getState().hydrate();
  }, []);

  useEffect(() => {
    // без шрифтов работаем на системных, но не молча
    if (fontError) console.warn(`Шрифты не загрузились: ${fontError.message}`);
  }, [fontError]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.surface.default },
        }}
      >
        <Stack.Protected guard={signedIn} redirectTo="/register">
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        {/* ссылка из письма открывается всегда: и до входа, и на другом устройстве */}
        <Stack.Screen name="auth/verify/[token]" />
        <Stack.Screen name="ui-kit" />
        <Stack.Screen name="status" />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
