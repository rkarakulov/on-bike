import { inset, space } from '@on-bike/design-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

import { Kicker } from './kicker';

export interface SectionHeaderProps {
  kicker: string;
  kickerTag?: string;
  title: string;
}

/** Kicker + `.sec-h` (Playfair 500 28/34) — шапка раздела ленты. */
export function SectionHeader({ kicker, kickerTag, title }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View>
      <Kicker label={kicker} tag={kickerTag} />
      <Text
        accessibilityRole="header"
        style={[textStyle('displayTitle'), styles.title, { color: theme.text.primary }]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.s2, marginBottom: inset.md },
});
