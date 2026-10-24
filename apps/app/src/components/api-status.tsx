import type { HealthResponse } from '@pokatim/contracts';
import { space } from '@pokatim/design-tokens';
import { t } from '@pokatim/i18n';
import { AsyncContent, SkeletonText, textStyle, useTheme, type AsyncState } from '@rkarakulov/ui';
import { StyleSheet, Text, View } from 'react-native';

/** Статус API из `/v1/health` через AsyncContent: скелетон, «Нет соединения», «Не удалось загрузить», повтор. */
export function ApiStatus({ query }: { query: AsyncState<HealthResponse> }) {
  const theme = useTheme();

  return (
    <AsyncContent
      query={query}
      // скелетон повторяет раскладку данных: подпись и значение
      skeleton={
        <View style={styles.status}>
          <SkeletonText variant="meta" />
          <SkeletonText variant="body" />
        </View>
      }
    >
      {(data) => (
        <View style={styles.status}>
          <Text style={[textStyle('meta'), { color: theme.text.secondary }]}>
            {t('apiStatus.title')}
          </Text>
          <Text style={[textStyle('body'), { color: theme.text.primary }]}>
            {t(data.status === 'ok' ? 'apiStatus.ok' : 'apiStatus.degraded')}
          </Text>
        </View>
      )}
    </AsyncContent>
  );
}

const styles = StyleSheet.create({ status: { gap: space.s1 } });
