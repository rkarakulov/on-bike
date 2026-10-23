import { space } from '@on-bike/design-tokens';
import { AsyncContent, SkeletonText, useTheme, type AsyncState } from '@rkarakulov/ui';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ShellSkeletonProps {
  /** сессию проверить не удалось (web: 429, сеть, сбой API после повторов): ошибка и повтор вместо скелетона */
  failure?: { error: unknown; retry: () => void };
}

const noop = () => undefined;

/**
 * Оболочка вкладок, пока сессия неизвестна (web: SSR и refresh по cookie; native — под splash): место заголовка
 * и вводного текста раздела — скелетоном (раскладка `ScreenPlaceholder`), без контента. После гидрации гард
 * открывает вкладки или регистрацию. Состояния — `AsyncContent`: при `failure` — «Нет соединения» (сеть) или
 * «Не удалось загрузить» с повтором, а не регистрация (сессия, возможно, жива).
 */
export function ShellSkeleton({ failure }: ShellSkeletonProps) {
  const theme = useTheme();
  const restore: AsyncState<never> = {
    data: undefined,
    error: failure?.error ?? null,
    isPending: failure === undefined,
    isError: failure !== undefined,
    fetchStatus: 'idle',
    refetch: failure?.retry ?? noop,
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: theme.surface.default }]}
    >
      <View style={styles.content}>
        <AsyncContent
          query={restore}
          skeleton={
            <View style={styles.skeleton}>
              <SkeletonText variant="displayTitle" lastLineWidth="60%" />
              <SkeletonText lines={2} />
            </View>
          }
        >
          {noop}
        </AsyncContent>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingTop: space.s6 },
  skeleton: { gap: space.s3 },
});
