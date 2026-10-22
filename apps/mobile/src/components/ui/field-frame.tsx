import { inset, size, space, stroke } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface FieldFrameProps {
  label: string;
  error?: string;
  /** подсказка под полем (`.fld-help`); при ошибке её место занимает ошибка */
  helper?: string;
  disabled: boolean;
  focused: boolean;
  /** значок справа в поле, когда нет ошибки (календарь у DateField) */
  trailing?: ReactNode;
  testID?: string;
  children: ReactNode;
}

/**
 * Общая оболочка полей `.fld` + `.inp` (TextField, DateField): подпись uppercase, поле 52 px с рамкой 1.5 px,
 * фокус — кольцо 2 px с отступом 2 px; ошибка — рамка error, квадратный «!» в поле и текст под полем.
 */
export function FieldFrame({
  label,
  error,
  helper,
  disabled,
  focused,
  trailing,
  testID,
  children,
}: FieldFrameProps) {
  const theme = useTheme();

  const borderColor = disabled
    ? theme.surface.disabled
    : error
      ? theme.status.error
      : theme.border.input;

  return (
    <View style={styles.field}>
      {/* подпись озвучивает сам контрол (accessibilityLabel) — видимую скрываем от скринридера */}
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[textStyle('label'), styles.label, { color: theme.text.secondary }]}
      >
        {label}
      </Text>
      <View style={[styles.ring, { borderColor: focused ? theme.border.focus : 'transparent' }]}>
        <View
          testID={testID}
          style={[
            styles.input,
            {
              borderColor,
              backgroundColor: disabled ? theme.surface.disabled : theme.surface.default,
            },
          ]}
        >
          {children}
          {error ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.errorMark, { borderColor: theme.status.error }]}
            >
              <Text style={[textStyle('counter'), { color: theme.status.error }]}>!</Text>
            </View>
          ) : (
            trailing
          )}
        </View>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${t('field.errorPrefix')}: ${error}`}
          style={[textStyle('meta'), styles.below, { color: theme.status.error }]}
        >
          {error}
        </Text>
      ) : helper ? (
        <Text
          // озвучивается подсказкой контрола (accessibilityHint)
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[textStyle('meta'), styles.below, { color: theme.text.secondary }]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

/** Высота содержимого поля внутри рамки — контрол на всю высоту, нажатие у края рамки тоже срабатывает. */
export const fieldContentHeight = size.fieldHeight - 2 * stroke.input;

const styles = StyleSheet.create({
  field: { marginTop: inset.lg },
  label: { marginBottom: space.s1 },
  ring: { borderWidth: stroke.indicator, padding: stroke.indicator, margin: -2 * stroke.indicator },
  input: {
    minHeight: size.fieldHeight,
    paddingHorizontal: inset.md,
    borderWidth: stroke.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  errorMark: {
    width: size.icon,
    height: size.icon,
    borderWidth: stroke.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  below: { marginTop: space.s2 },
});
