/// <reference types="jest" />
import { size, stroke, themes } from '@on-bike/design-tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';

import {
  AvatarStack,
  Banner,
  Button,
  Checkbox,
  Chip,
  EmptyState,
  Pill,
  SectionHeader,
  SegmentedControl,
  TextAction,
  TextField,
  Toggle,
} from './index';

const colorScheme = jest.mocked(useColorScheme);
afterEach(() => colorScheme.mockReturnValue('light'));

const light = themes.light;
const dark = themes.dark;

describe('Button', () => {
  it('primary: заливка action.primary, uppercase-метка, нажатие', async () => {
    const onPress = jest.fn();
    await render(<Button label="Участвовать" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Участвовать' });
    expect(button).toHaveStyle({
      backgroundColor: light.action.primary,
      minHeight: size.buttonHeight,
    });
    expect(screen.getByText('Участвовать')).toHaveStyle({
      color: light.action.onPrimary,
      textTransform: 'uppercase',
    });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled: цвета disabled, состояние и без нажатия', async () => {
    const onPress = jest.fn();
    await render(<Button label="Участвовать" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Участвовать' });
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ backgroundColor: light.surface.disabled });
    expect(screen.getByText('Участвовать')).toHaveStyle({ color: light.text.disabled });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('secondary в тёмной теме: прозрачная, рамка и текст text.primary Night Ride', async () => {
    colorScheme.mockReturnValue('dark');
    await render(<Button label="Я иду" variant="secondary" />);

    expect(screen.getByRole('button', { name: 'Я иду' })).toHaveStyle({
      backgroundColor: 'transparent',
      borderColor: dark.text.primary,
    });
  });

  it('loading: нажатие выключено, busy для скринридера, индикатор внутри, подпись остаётся', async () => {
    const onPress = jest.fn();
    await render(<Button label="Зарегистрироваться" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Зарегистрироваться' });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    expect(screen.getByTestId('button-indicator')).toBeOnTheScreen();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('без loading индикатора нет и состояние не busy', async () => {
    await render(<Button label="Участвовать" />);
    expect(screen.getByRole('button', { name: 'Участвовать' })).not.toBeBusy();
    expect(screen.queryByTestId('button-indicator')).toBeNull();
  });

  it('secondary на фото — text.onPhoto', async () => {
    await render(<Button label="Участвовать" variant="secondary" onPhoto />);
    expect(screen.getByText('Участвовать')).toHaveStyle({ color: light.text.onPhoto });
  });
});

describe('TextAction', () => {
  it('подчёркнутая, touch target 44, destructive — status.error', async () => {
    await render(<TextAction label="Удалить аккаунт" destructive />);

    expect(screen.getByRole('button', { name: 'Удалить аккаунт' })).toHaveStyle({
      minHeight: size.touchMin,
    });
    expect(screen.getByText('Удалить аккаунт')).toHaveStyle({
      color: light.status.error,
      textDecorationLine: 'underline',
    });
  });
});

describe('SectionHeader', () => {
  it('kicker accent + заголовок Playfair 500 с ролью header', async () => {
    await render(
      <SectionHeader
        kicker="Маршруты"
        kickerTag="по вашему выбору"
        title="Маршруты рядом с вами"
      />,
    );

    expect(screen.getByText('Маршруты')).toHaveStyle({ color: light.text.accent });
    expect(screen.getByText('по вашему выбору')).toHaveStyle({ color: light.text.secondary });
    expect(screen.getByRole('header', { name: 'Маршруты рядом с вами' })).toHaveStyle({
      fontFamily: 'PlayfairDisplay_500Medium',
    });
  });
});

describe('Pill и Chip', () => {
  it('pill: рамка цвета тона', async () => {
    await render(<Pill label="DQ" tone="error" />);
    expect(screen.getByText('DQ')).toHaveStyle({ color: light.status.error });
    expect(screen.getByTestId('pill')).toHaveStyle({
      borderColor: light.status.error,
      borderWidth: stroke.hairline,
    });
  });

  it('chip: выбранный — заливка text.primary и selected', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Гравий" selected onPress={onPress} />);

    const chip = screen.getByRole('button', { name: 'Гравий' });
    expect(chip).toBeSelected();
    expect(chip).toHaveStyle({ backgroundColor: light.text.primary, height: size.chipHeight });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Banner', () => {
  it('error: полоса 4 px status.error и роль alert', async () => {
    await render(
      <Banner tone="error" title="Трек не принят" message="Часть трека вне коридора." />,
    );

    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('Трек не принят')).toHaveStyle({ color: light.status.error });
    expect(screen.getByTestId('banner')).toHaveStyle({
      borderLeftWidth: stroke.bannerError,
      borderLeftColor: light.status.error,
      backgroundColor: light.surface.raised,
    });
  });

  it('warning в тёмной теме: полоса 2 px status.warning Night Ride', async () => {
    colorScheme.mockReturnValue('dark');
    await render(<Banner tone="warning" title="Окно закрывается" message="До 23:59." />);

    expect(screen.getByTestId('banner')).toHaveStyle({
      borderLeftWidth: stroke.bannerWarning,
      borderLeftColor: dark.status.warning,
      backgroundColor: dark.surface.raised,
    });
  });

  it('с onPress — весь баннер кнопка', async () => {
    const onPress = jest.fn();
    await render(<Banner message="Включите геопозицию" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('подпись — accessibilityLabel, ввод передаётся наружу', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="E-mail" value="" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ivan@mail.by');
    expect(onChangeText).toHaveBeenCalledWith('ivan@mail.by');
  });

  it('ошибка: текст ошибки status.error', async () => {
    await render(<TextField label="Дата рождения" error="Регистрация доступна с 18 лет." />);
    expect(screen.getByText('Регистрация доступна с 18 лет.')).toHaveStyle({
      color: light.status.error,
    });
  });

  it('disabled: поле не редактируется', async () => {
    await render(<TextField label="Класс" disabled value="Гравийный" />);
    expect(screen.getByLabelText('Класс')).toHaveProp('editable', false);
  });

  it('подсказка под полем text.secondary; при ошибке её заменяет ошибка', async () => {
    const helper = 'Не короче 8 символов.';
    await render(<TextField label="Пароль" helper={helper} />);
    expect(screen.getByText(helper, { includeHiddenElements: true })).toHaveStyle({
      color: light.text.secondary,
    });
    expect(screen.getByLabelText('Пароль')).toHaveProp('accessibilityHint', helper);

    await render(<TextField label="Пароль" helper={helper} error="Заполните поле." />);
    expect(screen.queryByText(helper, { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Заполните поле.')).toBeOnTheScreen();
  });

  it('e-mail: автозаглавные и автокоррекция отключаются пропсами', async () => {
    await render(<TextField label="E-mail" autoCapitalize="none" autoCorrect={false} />);
    expect(screen.getByLabelText('E-mail')).toHaveProp('autoCapitalize', 'none');
    expect(screen.getByLabelText('E-mail')).toHaveProp('autoCorrect', false);
  });
});

describe('Checkbox и Toggle', () => {
  it('checkbox: роль, checked, переключение', async () => {
    const onChange = jest.fn();
    await render(<Checkbox label="Согласие" checked={false} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Согласие' });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByTestId('checkbox-box')).toHaveStyle({
      width: size.checkbox,
      borderWidth: stroke.input,
      borderColor: light.border.input,
    });
    await fireEvent.press(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggle в тёмной теме: включённый — дорожка control.trackOn', async () => {
    colorScheme.mockReturnValue('dark');
    await render(<Toggle label="Тёмная тема" value onChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Тёмная тема' })).toBeChecked();
    expect(screen.getByTestId('toggle-track')).toHaveStyle({
      backgroundColor: dark.control.trackOn,
    });
  });
});

describe('SegmentedControl', () => {
  it('выбор сегмента', async () => {
    const onChange = jest.fn();
    const segments = [
      { key: 'strong', label: 'Сильный' },
      { key: 'medium', label: 'Средний' },
    ] as const;
    await render(<SegmentedControl segments={segments} selected="strong" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'Сильный' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Средний' }));
    expect(onChange).toHaveBeenCalledWith('medium');
  });
});

describe('AvatarStack и EmptyState', () => {
  it('стек аватаров — одна доступная подпись', async () => {
    await render(
      <AvatarStack people={[{ label: 'Райдер 1' }, { label: 'Райдер 2' }]} caption="идут 12" />,
    );
    expect(screen.getByLabelText('идут 12')).toBeOnTheScreen();
  });

  it('пустое состояние: заголовок и действие', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState title="Пока нет райдов" action={{ label: 'Создать райд', onPress }} />,
    );

    expect(screen.getByRole('header', { name: 'Пока нет райдов' })).toHaveStyle({
      fontFamily: 'PlayfairDisplay_500Medium',
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Создать райд' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('touch target ≥ 44 и тёмная тема полей', () => {
  it('Checkbox, Toggle и сегмент — строка не ниже touchMin', async () => {
    await render(
      <>
        <Checkbox label="Согласие" checked onChange={jest.fn()} />
        <Toggle label="Тема" value={false} onChange={jest.fn()} />
        <SegmentedControl segments={[{ key: 'a', label: 'А' }]} selected="a" onChange={jest.fn()} />
      </>,
    );

    for (const element of [
      screen.getByRole('checkbox'),
      screen.getByRole('switch'),
      screen.getByRole('tab'),
    ]) {
      expect(element).toHaveStyle({ minHeight: size.touchMin });
    }
  });

  it('Chip 36 px добирает зону нажатия до 44 через hitSlop', async () => {
    await render(<Chip label="Гравий" />);
    expect(screen.getByRole('button', { name: 'Гравий' })).toHaveProp(
      'hitSlop',
      (size.touchMin - size.chipHeight) / 2,
    );
  });

  it('TextField в тёмной теме: текст text.primary Night Ride', async () => {
    colorScheme.mockReturnValue('dark');
    await render(<TextField label="E-mail" value="ivan@mail.by" />);
    expect(screen.getByLabelText('E-mail')).toHaveStyle({ color: dark.text.primary });
  });
});
