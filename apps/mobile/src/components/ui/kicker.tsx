import { space } from '@on-bike/design-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface KickerProps {
  label: string;
  /** нейтральный тег рядом («по вашему выбору») */
  tag?: string;
}

/** `.kicker` (accent, uppercase) + `.kicker-tag` (text.secondary). */
export function Kicker({ label, tag }: KickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[textStyle('label'), { color: theme.text.accent }]}>{label}</Text>
      {tag ? (
        <Text style={[textStyle('labelTag'), { color: theme.text.secondary }]}>{tag}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space.s2 },
});
