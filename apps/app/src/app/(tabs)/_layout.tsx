import { t } from '@on-bike/i18n';
import { useTheme } from '@rkarakulov/ui';
import { Tabs } from 'expo-router/js-tabs';

import { ShellSkeleton } from '@/components/shell-skeleton';
import { TabBar } from '@/components/tab-bar';
import { useSessionStore } from '@/features/auth/session-store';

export default function TabsLayout() {
  const theme = useTheme();
  // сессия ещё неизвестна (SSR, восстановление при запуске): гард пускает сюда, но контент — только после входа
  const sessionUnknown = useSessionStore((state) => state.status === 'unknown');

  if (sessionUnknown) return <ShellSkeleton />;

  return (
    <Tabs
      // фон сцены — цвет темы, чтобы ленивая вкладка не мигала белым в Night Ride
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: theme.surface.default } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="races" options={{ title: t('tabs.races') }} />
      <Tabs.Screen name="rides" options={{ title: t('tabs.rides') }} />
      <Tabs.Screen name="routes" options={{ title: t('tabs.routes') }} />
      <Tabs.Screen name="calendar" options={{ title: t('tabs.calendar') }} />
    </Tabs>
  );
}
