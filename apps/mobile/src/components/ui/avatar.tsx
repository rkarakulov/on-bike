import { inset, size, stroke } from '@on-bike/design-tokens';
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface AvatarProps {
  /** фото; без него — пустой квадрат (генеративная «Личная линия» — с экраном профиля) */
  source?: ImageSourcePropType;
  label: string;
  dimension?: number;
}

/** `.ava`: квадрат с рамкой text.primary на surface.raised. */
export function Avatar({ source, label, dimension = size.avatar }: AvatarProps) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.avatar,
        {
          width: dimension,
          height: dimension,
          borderColor: theme.text.primary,
          backgroundColor: theme.surface.raised,
        },
      ]}
    >
      {source ? <Image source={source} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

export interface AvatarStackProps {
  people: readonly { source?: ImageSourcePropType; label: string }[];
  /** «идут 12» */
  caption: string;
}

/** `.avstack`: аватары 24 px внахлёст с кольцом цвета фона + подпись. */
export function AvatarStack({ people, caption }: AvatarStackProps) {
  const theme = useTheme();

  return (
    <View style={styles.stack} accessible accessibilityLabel={caption}>
      {people.map((person, index) => (
        <View
          key={`${person.label}-${index}`}
          style={[
            styles.ring,
            index > 0 && styles.overlap,
            { backgroundColor: theme.surface.default },
          ]}
        >
          <Avatar source={person.source} label={person.label} dimension={size.avatarStack} />
        </View>
      ))}
      <Text style={[textStyle('meta'), styles.caption, { color: theme.text.secondary }]}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderWidth: stroke.hairline, overflow: 'hidden' },
  stack: { minHeight: size.touchMin, flexDirection: 'row', alignItems: 'center' },
  ring: { padding: stroke.indicator },
  // кольцо цвета фона — padding обёртки, поэтому нахлёст увеличиваем на его ширину
  overlap: { marginLeft: -size.avatarOverlap - 2 * stroke.indicator },
  caption: { marginLeft: inset.caption },
});
