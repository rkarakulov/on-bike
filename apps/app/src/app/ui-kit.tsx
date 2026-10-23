import { useTheme, UiKit } from '@rkarakulov/ui';
import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import photo from '../../assets/images/icon.png';

/** Витрина компонентов базы — только в dev-сборке; в production маршрут ведёт на Главную. */
export default function UiKitScreen() {
  const theme = useTheme();
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface.default }]}>
      <UiKit photo={photo} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { flex: 1 } });
