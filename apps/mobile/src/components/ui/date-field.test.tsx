/// <reference types="jest" />
import { size, themes } from '@on-bike/design-tokens';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { DateField } from './date-field';

const light = themes.light;
const openAndroid = jest.mocked(DateTimePickerAndroid.open);

afterEach(() => jest.clearAllMocks());

describe('DateField', () => {
  it('как TextField: подпись, поле 52 px, пустое — подсказка выбора, helper под полем', async () => {
    await render(
      <DateField
        label="Дата рождения"
        helper="Приложение доступно с 18 лет."
        onChange={jest.fn()}
      />,
    );

    const field = screen.getByRole('button', { name: 'Дата рождения' });
    expect(field).toHaveAccessibilityValue({ text: 'Выберите дату' });
    expect(screen.getByTestId('date-field-input')).toHaveStyle({
      minHeight: size.fieldHeight,
      borderColor: light.border.input,
    });
    expect(
      screen.getByTestId('date-field-calendar', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Приложение доступно с 18 лет.', { includeHiddenElements: true }),
    ).toHaveStyle({
      color: light.text.secondary,
    });
  });

  it('значение показывается по-русски: «14 марта 1991»', async () => {
    await render(<DateField label="Дата рождения" value="1991-03-14" onChange={jest.fn()} />);
    expect(screen.getByText('14 марта 1991')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Дата рождения' })).toHaveAccessibilityValue({
      text: '14 марта 1991',
    });
  });

  it('iOS: нажатие раскрывает нативный пикер; выбор — локальная дата без сдвига; «Готово» — уход с поля', async () => {
    const onChange = jest.fn();
    const onBlur = jest.fn();
    await render(
      <DateField
        label="Дата рождения"
        value="1991-03-14"
        onChange={onChange}
        onBlur={onBlur}
        minimumDate="1900-01-01"
        maximumDate="2026-10-22"
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Дата рождения' }));
    const picker = screen.getByTestId('date-picker');
    expect(picker).toHaveProp('mode', 'date');
    expect(picker).toHaveProp('value', new Date(1991, 2, 14));
    expect(picker).toHaveProp('maximumDate', new Date(2026, 9, 22));
    expect(screen.getByRole('button', { name: 'Дата рождения' })).toBeExpanded();

    // локальная полночь 12 мая 2010 в Минске = 11 мая по UTC
    await fireEvent(picker, 'valueChange', { nativeEvent: {} }, new Date(2010, 4, 12));
    expect(onChange).toHaveBeenCalledWith('2010-05-12');
    expect(onBlur).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Готово' }));
    expect(screen.queryByTestId('date-picker')).toBeNull();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('iOS: «Готово» без прокрутки пустого поля выбирает показанную дату', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Дата" onChange={onChange} maximumDate="2026-10-22" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Дата' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Готово' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-22');
  });

  it('пустое поле открывает пикер на initialPickerDate (например, 18 лет назад)', async () => {
    await render(
      <DateField
        label="Дата"
        onChange={jest.fn()}
        maximumDate="2026-10-22"
        initialPickerDate="2008-10-22"
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Дата' }));
    expect(screen.getByTestId('date-picker')).toHaveProp('value', new Date(2008, 9, 22));
  });

  it('Android: системный диалог; выбор и закрытие — уход с поля', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onChange = jest.fn();
    const onBlur = jest.fn();
    await render(<DateField label="Дата" value="1991-03-14" onChange={onChange} onBlur={onBlur} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Дата' }));
    expect(screen.queryByTestId('date-picker')).toBeNull();
    const options = openAndroid.mock.calls[0][0];
    expect(options).toMatchObject({ mode: 'date', value: new Date(1991, 2, 14) });

    options.onValueChange?.({ nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(1988, 1, 2));
    expect(onChange).toHaveBeenCalledWith('1988-02-02');
    expect(onBlur).toHaveBeenCalledTimes(1);

    options.onDismiss?.();
    expect(onBlur).toHaveBeenCalledTimes(2);
  });

  it('ошибка: рамка и текст status.error, «!» вместо календаря, подсказка скрыта', async () => {
    await render(
      <DateField
        label="Дата рождения"
        value="2010-05-12"
        helper="Приложение доступно с 18 лет."
        error="Регистрация доступна с 18 лет."
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('date-field-input')).toHaveStyle({ borderColor: light.status.error });
    expect(screen.getByText('Регистрация доступна с 18 лет.')).toHaveStyle({
      color: light.status.error,
    });
    expect(screen.queryByTestId('date-field-calendar', { includeHiddenElements: true })).toBeNull();
    expect(
      screen.queryByText('Приложение доступно с 18 лет.', { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Дата рождения' })).toHaveProp(
      'accessibilityHint',
      'Регистрация доступна с 18 лет.',
    );
  });

  it('disabled: пикер не открывается', async () => {
    await render(<DateField label="Дата" value="1991-03-14" onChange={jest.fn()} disabled />);

    const field = screen.getByRole('button', { name: 'Дата' });
    expect(field).toBeDisabled();
    await fireEvent.press(field);
    expect(screen.queryByTestId('date-picker')).toBeNull();
    expect(screen.getByTestId('date-field-input')).toHaveStyle({
      backgroundColor: light.surface.disabled,
    });
  });
});
