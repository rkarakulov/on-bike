import { space } from '@on-bike/design-tokens';
import { SkeletonGroup, SkeletonText, useTheme } from '@rkarakulov/ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Оболочка вкладок, пока сессия неизвестна (web: SSR и refresh по cookie; native — под splash): место заголовка
 * и вводного текста раздела — скелетоном (раскладка `ScreenPlaceholder`), без контента. После гидрации гард
 * открывает вкладки или регистрацию.
 */
export function ShellSkeleton() {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: theme.surface.default }]}
    >
      <SkeletonGroup>
        <View style={styles.content}>
          <SkeletonText variant="displayTitle" lastLineWidth="60%" />
          <SkeletonText lines={2} />
        </View>
      </SkeletonGroup>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingTop: space.s6, gap: space.s3 },
});
