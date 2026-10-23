import { inset, size, stroke } from '@on-bike/design-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface Segment<K extends string> {
  key: K;
  label: string;
}

export interface SegmentedControlProps<K extends string> {
  segments: readonly Segment<K>[];
  selected: K;
  onChange: (key: K) => void;
}

/** `.seg`: вкладки внутри экрана (кластеры результатов) — выбранная с полосой 2 px снизу. */
export function SegmentedControl<K extends string>({
  segments,
  selected,
  onChange,
}: SegmentedControlProps<K>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.row, { borderBottomColor: theme.border.subtle }]}
    >
      {segments.map((segment, index) => {
        const active = segment.key === selected;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.key)}
            style={[
              styles.segment,
              index === 0 && styles.first,
              { borderBottomColor: active ? theme.text.primary : 'transparent' },
            ]}
          >
            <Text
              style={[
                textStyle('chip'),
                { color: active ? theme.text.primary : theme.text.secondary },
              ]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: stroke.hairline },
  segment: {
    minHeight: size.touchMin,
    justifyContent: 'center',
    paddingHorizontal: inset.segment,
    borderBottomWidth: stroke.indicator,
    marginBottom: -stroke.hairline,
  },
  first: { paddingLeft: 0 },
});
