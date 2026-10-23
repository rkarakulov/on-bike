import { size, space, stroke } from '@on-bike/design-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** `.cbx`: квадрат 22 px; отмеченный — заливка text.primary и галочка action.onPrimary. Вся строка — зона нажатия. */
export function Checkbox({ label, checked, onChange, disabled = false }: CheckboxProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View
        testID="checkbox-box"
        style={[
          styles.box,
          disabled
            ? { backgroundColor: theme.surface.disabled, borderColor: theme.border.subtle }
            : checked
              ? { backgroundColor: theme.text.primary, borderColor: theme.text.primary }
              : { backgroundColor: theme.surface.default, borderColor: theme.border.input },
        ]}
      >
        {checked ? <View style={[styles.mark, { borderColor: theme.action.onPrimary }]} /> : null}
      </View>
      <Text
        style={[
          textStyle('body'),
          styles.label,
          { color: disabled ? theme.text.disabled : theme.text.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: size.touchMin,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
    paddingTop: space.s3,
  },
  box: {
    width: size.checkbox,
    height: size.checkbox,
    borderWidth: stroke.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // галочка: нижняя и правая грани, повёрнутые на 45°
  mark: {
    width: size.checkbox / 4,
    height: size.checkbox / 2,
    borderRightWidth: stroke.indicator,
    borderBottomWidth: stroke.indicator,
    transform: [{ rotate: '45deg' }],
    marginTop: -stroke.indicator,
  },
  label: { flex: 1 },
});
