import { font, palette, space } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const theme = useColorScheme() === 'dark' ? palette.nightRide : palette.jerseyAura;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>
          {t('app.name')}
        </Text>
        <Text style={[styles.tagline, { color: theme.ink2 }]}>{t('app.tagline')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: space.s5, gap: space.s3 },
  title: { fontFamily: font.display, fontSize: 34, fontWeight: '600' },
  tagline: { fontFamily: font.text, fontSize: 17 },
});
