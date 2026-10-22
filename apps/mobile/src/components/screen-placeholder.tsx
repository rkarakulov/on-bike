import { space } from '@on-bike/design-tokens';
import { t, type MessageKey } from '@on-bike/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

interface ScreenPlaceholderProps {
  title: MessageKey;
}

/** Временный экран раздела, пока его содержимое не реализовано. */
export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={[textStyle('title'), { color: theme.ink }]}>
          {t(title)}
        </Text>
        <Text style={[textStyle('body'), { color: theme.ink2 }]}>{t('placeholder.soon')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: space.s5, paddingTop: space.s6, gap: space.s3 },
});
