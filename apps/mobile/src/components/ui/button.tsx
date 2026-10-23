import { inset, motion, size, space, stroke } from '@on-bike/design-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  /** идёт запрос (мутация, AGENTS.md §4.12): нажатие выключено, индикатор внутри, подпись остаётся */
  loading?: boolean;
  /** вторичная кнопка поверх фото (белая) */
  onPhoto?: boolean;
}

/** `.btn-pri` / `.btn-sec`: 48 px, uppercase, без скругления. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  onPhoto = false,
}: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';

  const background = primary
    ? disabled
      ? theme.surface.disabled
      : theme.action.primary
    : 'transparent';
  const foreground = disabled
    ? theme.text.disabled
    : primary
      ? theme.action.onPrimary
      : onPhoto
        ? theme.text.onPhoto
        : theme.text.primary;
  const border = primary ? background : foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: border,
          opacity: pressed ? motion.pressedOpacity : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator testID="button-indicator" size="small" color={foreground} />
      ) : null}
      <Text style={[textStyle('button'), { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: size.buttonHeight,
    paddingHorizontal: inset.lg,
    borderWidth: stroke.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.s2,
  },
});
