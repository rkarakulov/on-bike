import { useTheme } from '@rkarakulov/ui';
import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'register' };

/** Стек регистрации — доступен только без сессии (гард в корневом layout). */
export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.surface.default },
      }}
    >
      <Stack.Screen name="register" />
      <Stack.Screen name="check-email" />
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
