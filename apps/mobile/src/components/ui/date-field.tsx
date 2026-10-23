import { size, space, stroke } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { formatCalendarDate, fromCalendarDate, toCalendarDate } from '@/lib/calendar-date';
import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

import { FieldFrame } from './field-frame';
import { TextAction } from './text-action';

export interface DateFieldProps {
  label: string;
  /** календарная дата `YYYY-MM-DD` (без времени и часового пояса) */
  value?: string;
  onChange: (value: string) => void;
  /** уход с поля: пикер закрыт (выбор, «Готово» или отмена) — момент проверки значения */
  onBlur?: () => void;
  minimumDate?: string;
  maximumDate?: string;
  /** с какой даты открывается пикер пустого поля (по умолчанию — maximumDate или сегодня) */
  initialPickerDate?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
}

/**
 * Поле даты с нативным пикером (`picker` прототипа): выглядит как TextField, справа — значок календаря.
 * Android — системный диалог, iOS — колесо под полем с «Готово». Дата берётся из локальных
 * компонентов выбранного дня, поэтому не сдвигается на день из-за часового пояса.
 */
export function DateField({
  label,
  value,
  onChange,
  onBlur,
  minimumDate,
  maximumDate,
  initialPickerDate,
  error,
  helper,
  disabled = false,
}: DateFieldProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);

  const min = minimumDate ? fromCalendarDate(minimumDate) : undefined;
  const max = maximumDate ? fromCalendarDate(maximumDate) : undefined;
  const initial = initialPickerDate ? fromCalendarDate(initialPickerDate) : undefined;
  const pickerValue = value ? fromCalendarDate(value) : (initial ?? max ?? new Date());
  const shown = value ? formatCalendarDate(value) : undefined;

  const select = (date: Date) => onChange(toCalendarDate(date));

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'date',
        minimumDate: min,
        maximumDate: max,
        onValueChange: (_event, date) => {
          select(date);
          onBlur?.();
        },
        onDismiss: () => onBlur?.(),
      });
      return;
    }
    setOpen(true);
  };

  const done = () => {
    if (!value) select(pickerValue);
    setOpen(false);
    onBlur?.();
  };

  const foreground = disabled
    ? theme.text.disabled
    : shown
      ? theme.text.primary
      : theme.text.placeholder;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: shown ?? t('field.datePlaceholder') }}
        accessibilityHint={error ?? helper}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={openPicker}
      >
        <FieldFrame
          label={label}
          error={error}
          helper={helper}
          disabled={disabled}
          focused={open}
          testID="date-field-input"
          trailing={
            <View
              testID="date-field-calendar"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.calendar, { borderColor: foreground }]}
            />
          }
        >
          <Text style={[textStyle('body'), styles.text, { color: foreground }]}>
            {shown ?? t('field.datePlaceholder')}
          </Text>
        </FieldFrame>
      </Pressable>
      {open ? (
        <View style={styles.inline}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="spinner"
            locale="ru-RU"
            minimumDate={min}
            maximumDate={max}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            textColor={theme.text.primary}
            onValueChange={(_event, date) => select(date)}
          />
          <View style={styles.done}>
            <TextAction label={t('field.datePickerDone')} onPress={done} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1 },
  // значок календаря: квадрат с плотной «шапкой» — из токенов, без картинок
  calendar: {
    width: size.icon,
    height: size.icon,
    borderWidth: stroke.input,
    borderTopWidth: 2 * stroke.indicator,
  },
  inline: { marginTop: space.s2 },
  done: { alignItems: 'flex-end' },
});
