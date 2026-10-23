import { inset, space, stroke } from '@on-bike/design-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { type Theme, useTheme } from '@/theme/theme';

export type PillTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

const toneColor = (theme: Theme, tone: PillTone) =>
  ({
    neutral: theme.text.primary,
    accent: theme.text.accent,
    success: theme.status.success,
    warning: theme.status.warning,
    error: theme.status.error,
  })[tone];

export interface PillProps {
  label: string;
  tone?: PillTone;
}

/** `.pill`: статус результата/гонки, рамка цвета текста. */
export function Pill({ label, tone = 'neutral' }: PillProps) {
  const color = toneColor(useTheme(), tone);

  return (
    <View testID="pill" style={[styles.pill, { borderColor: color }]}>
      <Text style={[textStyle(tone === 'error' ? 'tag' : 'pill'), { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: space.s1,
    paddingVertical: inset.xs,
    paddingHorizontal: inset.sm,
    borderWidth: stroke.hairline,
  },
});
