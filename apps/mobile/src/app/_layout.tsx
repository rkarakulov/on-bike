import { palette } from '@on-bike/design-tokens';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const theme = useColorScheme() === 'dark' ? palette.nightRide : palette.jerseyAura;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
      <StatusBar style="auto" />
    </>
  );
}
