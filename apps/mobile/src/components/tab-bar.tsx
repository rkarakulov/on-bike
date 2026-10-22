import { size, space } from '@on-bike/design-tokens';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

/**
 * Панель вкладок по прототипу: активная — ink-метка 600 и 2 px ink-полоса по верхнему краю,
 * неактивная — ink-2. Accent во вкладках не используется.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      testID="tab-bar"
      style={[
        styles.bar,
        { backgroundColor: theme.bg, borderTopColor: theme.border, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const options = descriptors[route.key]?.options;
        const label = options?.title ?? route.name;
        const focused = state.index === index;

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.tab}
          >
            <View
              testID={`tab-indicator-${route.name}`}
              style={[styles.indicator, { backgroundColor: focused ? theme.ink : 'transparent' }]}
            />
            <Text
              numberOfLines={1}
              style={[textStyle('tab'), { color: focused ? theme.ink : theme.ink2 }]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    alignItems: 'center',
    minHeight: size.tabBarHeight,
    paddingBottom: space.s2,
    gap: space.s2,
  },
  indicator: { alignSelf: 'stretch', height: size.tabIndicator },
});
