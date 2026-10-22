import { inset, size, space, stroke } from '@on-bike/design-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export type BannerTone = 'info' | 'warning' | 'error';

export interface BannerProps {
  message: string;
  title?: string;
  tone?: BannerTone;
  /** весь баннер — ссылка (например, в настройки ОС) */
  onPress?: () => void;
}

/** `.bn` / `.bn-warn` / `.bn-err`: плашка на surface.raised, полоса слева 2 / 4 px. */
export function Banner({ message, title, tone = 'info', onPress }: BannerProps) {
  const theme = useTheme();
  const toneColor =
    tone === 'error' ? theme.status.error : tone === 'warning' ? theme.status.warning : undefined;
  const stripe =
    tone === 'error' ? stroke.bannerError : tone === 'warning' ? stroke.bannerWarning : 0;

  const content = (
    <View
      testID="banner"
      style={[
        styles.banner,
        {
          backgroundColor: theme.surface.raised,
          borderLeftWidth: stripe,
          borderLeftColor: toneColor,
        },
      ]}
    >
      {title ? (
        <Text style={[textStyle('bannerTitle'), { color: toneColor ?? theme.text.primary }]}>
          {title}
        </Text>
      ) : null}
      <Text style={[textStyle('banner'), { color: theme.text.primary }]}>{message}</Text>
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityRole={tone === 'info' ? undefined : 'alert'} accessible>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      // срочность warning/error озвучивается и у нажимаемого баннера
      accessibilityLiveRegion={tone === 'info' ? 'none' : 'polite'}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: size.touchMin,
    paddingVertical: space.s3,
    paddingHorizontal: inset.md,
    gap: space.s1,
  },
});
