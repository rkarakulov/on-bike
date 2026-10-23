import { size, space, stroke } from '@on-bike/design-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

import { Button } from './button';

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

/** `.empty`: линия text.primary сверху, плитка-иконка, заголовок Playfair 500 22/27, опциональное действие. */
export function EmptyState({ title, message, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.empty, { borderTopColor: theme.text.primary }]}>
      <View style={[styles.tile, { borderColor: theme.text.secondary }]} />
      <Text
        accessibilityRole="header"
        style={[textStyle('displaySm'), styles.title, { color: theme.text.primary }]}
      >
        {title}
      </Text>
      {message ? (
        <Text style={[textStyle('body'), { color: theme.text.secondary }]}>{message}</Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { borderTopWidth: stroke.hairline, paddingVertical: size.emptyPadding, gap: space.s2 },
  tile: { width: size.emptyTile, height: size.emptyTile, borderWidth: stroke.hairline },
  title: { marginTop: space.s2 },
  action: { marginTop: space.s3, alignSelf: 'flex-start' },
});
