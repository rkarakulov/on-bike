import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

import { FieldFrame, fieldContentHeight } from './field-frame';

export interface TextFieldProps extends Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'keyboardType'
  | 'autoComplete'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'secureTextEntry'
  | 'onBlur'
> {
  label: string;
  error?: string;
  /** подсказка под полем, пока нет ошибки */
  helper?: string;
  disabled?: boolean;
}

/**
 * `.fld` + `.inp`: подпись uppercase, поле 52 px с рамкой 1.5 px, ошибка — рамка error, квадратный «!» и текст под полем.
 * Фокус — кольцо 2 px с отступом 2 px (outline прототипа), без сдвига вёрстки.
 */
export function TextField({
  label,
  error,
  helper,
  disabled = false,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <FieldFrame label={label} error={error} helper={helper} disabled={disabled} focused={focused}>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={error ?? helper}
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
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1, alignSelf: 'stretch', minHeight: fieldContentHeight, paddingVertical: 0 },
});
