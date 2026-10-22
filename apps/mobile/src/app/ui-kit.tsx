import { Redirect } from 'expo-router';

import { UiKit } from '@/components/ui-kit';

/** Витрина компонентов — только в dev-сборке; в production маршрут ведёт на Главную. */
export default function UiKitScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <UiKit />;
}
