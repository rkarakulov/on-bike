import { space } from '@pokatim/design-tokens';
import { t, type MessageKey } from '@pokatim/i18n';
import { textStyle, useTheme } from '@rkarakulov/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenPlaceholderProps {
  title: MessageKey;
  /** Вводный текст; без него — «раздел появится позже» (вкладки, ещё не реализованные). */
  lead?: MessageKey;
  children?: ReactNode;
}

/** Экран-заготовка: заголовок, вводный текст и содержимое раздела. */
export function ScreenPlaceholder({
  title,
  lead = 'placeholder.soon',
  children,
}: ScreenPlaceholderProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: theme.surface.default }]}
    >
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[textStyle('displayTitle'), { color: theme.text.primary }]}
        >
          {t(title)}
        </Text>
        <Text style={[textStyle('body'), { color: theme.text.secondary }]}>{t(lead)}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingTop: space.s6, gap: space.s3 },
});
