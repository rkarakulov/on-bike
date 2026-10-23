import { radius, size, space } from '@on-bike/design-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** `.tgl` 51×31 — единственный скруглённый элемент системы. Строка настроек целиком нажимаема. */
export function Toggle({ label, value, onChange, disabled = false }: ToggleProps) {
  const theme = useTheme();
  const thumbOffset =
    size.toggleWidth - size.toggleThumb - 2 * ((size.toggleHeight - size.toggleThumb) / 2);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <Text
        style={[
          textStyle('body'),
          styles.label,
          { color: disabled ? theme.text.disabled : theme.text.primary },
        ]}
      >
        {label}
      </Text>
      <View
        testID="toggle-track"
        style={[
          styles.track,
          {
            backgroundColor: disabled
              ? theme.surface.disabled
              : value
                ? theme.control.trackOn
                : theme.control.track,
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: value ? theme.control.thumbOn : theme.control.thumb,
              transform: [{ translateX: value ? thumbOffset : 0 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.touchMin, flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  label: { flex: 1 },
  track: {
    width: size.toggleWidth,
    height: size.toggleHeight,
    borderRadius: radius.pill,
    padding: (size.toggleHeight - size.toggleThumb) / 2,
  },
  thumb: { width: size.toggleThumb, height: size.toggleThumb, borderRadius: radius.pill },
});
