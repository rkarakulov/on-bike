import { size, space } from '@on-bike/design-tokens';
import { Pressable, StyleSheet, Text } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface TextActionProps {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/** `.ta`: подчёркнутое uppercase-действие («Все маршруты», «Удалить аккаунт»), touch target 44. */
export function TextAction({
  label,
  onPress,
  destructive = false,
  disabled = false,
}: TextActionProps) {
  const theme = useTheme();
  const color = disabled
    ? theme.text.disabled
    : destructive
      ? theme.status.error
      : theme.text.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      <Text style={[textStyle('textAction'), styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { minHeight: size.touchMin, flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  label: { textDecorationLine: 'underline' },
});
