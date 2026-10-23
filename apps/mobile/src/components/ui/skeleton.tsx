import { motion, size, space, type TextStyleName, typography } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Animated, type DimensionValue, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/theme/motion';
import { useTheme } from '@/theme/theme';

const PulseContext = createContext<Animated.Value | number>(1);

export interface SkeletonGroupProps {
  children: ReactNode;
  /** подпись для скринридера; по умолчанию «Загрузка» */
  label?: string;
}

/**
 * Обёртка экрана/блока в состоянии загрузки: один общий пульс 1 → .6 → 1 за 1,2 с для всех блоков,
 * статично при reduce motion. Для скринридера — один элемент «Загрузка», блоки скрыты.
 */
export function SkeletonGroup({ children, label = t('state.loading') }: SkeletonGroupProps) {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // пульс — только когда точно известно, что reduce motion выключен
    if (reduced !== false) {
      opacity.setValue(1);
      return;
    }
    const half = motion.skeletonPulseMs / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: motion.skeletonMinOpacity,
          duration: half,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: half, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      testID="skeleton-group"
    >
      <PulseContext.Provider value={reduced === false ? opacity : 1}>
        <View importantForAccessibility="no-hide-descendants">{children}</View>
      </PulseContext.Provider>
    </View>
  );
}

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
}

/** Квадратный блок `surface.skeleton` — повторяет место будущего контента. */
export function Skeleton({ width = '100%', height }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useContext(PulseContext);

  return (
    <Animated.View
      testID="skeleton"
      style={{ width, height, opacity, backgroundColor: theme.surface.skeleton }}
    />
  );
}

export interface SkeletonTextProps {
  /** стиль текста, место которого занимаем: высота строки = его fontSize, шаг = lineHeight */
  variant?: TextStyleName;
  lines?: number;
  /** ширина последней строки — короче, как у реального абзаца */
  lastLineWidth?: DimensionValue;
}

/** Строки текста: блоки высотой кегля с интервалом строки выбранного стиля. */
export function SkeletonText({
  variant = 'body',
  lines = 1,
  lastLineWidth = '60%',
}: SkeletonTextProps) {
  const token = typography[variant];

  return (
    <View
      style={{
        gap: token.lineHeight - token.size,
        paddingVertical: (token.lineHeight - token.size) / 2,
      }}
    >
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height={token.size}
          width={lines > 1 && index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </View>
  );
}

/** Заготовка: герой раздела (`.skeleton-card` прототипа) — блок во всю ширину, мета, кнопка. */
export function SkeletonHeroCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={size.heroHeight} />
      <SkeletonText variant="titleSm" lastLineWidth="70%" lines={2} />
      <Skeleton height={size.buttonHeight} width="45%" />
    </View>
  );
}

/** Заготовка: строка списка высотой `rowMin`. */
export function SkeletonListRow() {
  return (
    <View style={styles.row}>
      <Skeleton height={size.avatar} width={size.avatar} />
      <View style={styles.rowText}>
        <SkeletonText variant="titleSm" />
        <SkeletonText variant="meta" lines={1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.s3 },
  row: { minHeight: size.rowMin, flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  rowText: { flex: 1 },
});
