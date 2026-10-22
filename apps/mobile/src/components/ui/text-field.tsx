import { inset, size, space, stroke } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

export interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'keyboardType'
  | 'autoComplete'
  | 'secureTextEntry'
  | 'onBlur'
> {
  label: string;
  error?: string;
  disabled?: boolean;
}

/**
 * `.fld` + `.inp`: подпись uppercase, поле 52 px с рамкой 1.5 px, ошибка — рамка error, квадратный «!» и текст под полем.
 * Фокус — кольцо 2 px с отступом 2 px (outline прототипа), без сдвига вёрстки.
 */
export function TextField({
  label,
  error,
  disabled = false,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = disabled
    ? theme.surface.disabled
    : error
      ? theme.status.error
      : theme.border.input;

  return (
    <View style={styles.field}>
      {/* подпись озвучивает сам TextInput (accessibilityLabel) — видимую скрываем от скринридера */}
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[textStyle('label'), styles.label, { color: theme.text.secondary }]}
      >
        {label}
      </Text>
      <View style={[styles.ring, { borderColor: focused ? theme.border.focus : 'transparent' }]}>
        <View
          style={[
            styles.input,
            {
              borderColor,
              backgroundColor: disabled ? theme.surface.disabled : theme.surface.default,
            },
          ]}
        >
          <TextInput
            {...inputProps}
            accessibilityLabel={label}
            accessibilityHint={error}
            accessibilityState={{ disabled }}
            editable={!disabled}
            placeholderTextColor={theme.text.placeholder}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={[
              textStyle('body'),
              styles.text,
              { color: disabled ? theme.text.disabled : theme.text.primary },
            ]}
          />
          {error ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.errorMark, { borderColor: theme.status.error }]}
            >
              <Text style={[textStyle('counter'), { color: theme.status.error }]}>!</Text>
            </View>
          ) : null}
        </View>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${t('field.errorPrefix')}: ${error}`}
          style={[textStyle('meta'), styles.error, { color: theme.status.error }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

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
  // сам TextInput на всю высоту поля — нажатие у края рамки тоже ставит фокус
  text: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: size.fieldHeight - 2 * stroke.input,
    paddingVertical: 0,
  },
  errorMark: {
    width: size.icon,
    height: size.icon,
    borderWidth: stroke.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { marginTop: space.s2 },
});
