import { inset, size, space, stroke } from '@on-bike/design-tokens';
import { Pressable, StyleSheet, Text } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** `.chip`: фильтр 36 px; выбранный — заливка text.primary. Зона нажатия добирается до 44 по вертикали. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={(size.touchMin - size.chipHeight) / 2}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.text.primary, borderColor: theme.text.primary }
          : { borderColor: theme.border.input },
      ]}
    >
      <Text
        style={[
          textStyle('chip'),
          { color: selected ? theme.action.onPrimary : theme.text.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: size.chipHeight,
    paddingHorizontal: inset.md,
    borderWidth: stroke.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
});
