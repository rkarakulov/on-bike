/// <reference types="jest" />
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import UiKitScreen from '../app/ui-kit';
import { tabRoutes } from './app-routes';

const app = { ...tabRoutes, 'ui-kit': UiKitScreen };

// __DEV__ в типах RN — константа; в тестах переключаем как глобальное значение
const setDev = (value: boolean) => Object.assign(globalThis, { __DEV__: value });

describe('витрина компонентов', () => {
  const devFlag = __DEV__;
  afterEach(() => setDev(devFlag));

  it('в dev открывается с Главной и показывает все разделы', async () => {
    await renderRouter(app);

    await fireEvent.press(screen.getByRole('button', { name: 'Витрина компонентов' }));

    expect(await screen.findByRole('header', { name: 'Витрина компонентов' })).toBeOnTheScreen();
    for (const section of [
      'Кнопки',
      'Метки и статусы',
      'Баннеры',
      'Поля и выбор',
      'Участники',
      'Загрузка',
      'Пустое состояние',
    ]) {
      expect(screen.getByText(section)).toBeOnTheScreen();
    }
    expect(
      screen.getByRole('checkbox', { name: 'Соглашаюсь на обработку персональных данных' }),
    ).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Тёмная тема' })).not.toBeChecked();
    // disabled-состояния тоже показаны на витрине
    expect(screen.getByRole('checkbox', { name: 'Недоступно' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Недоступно' })).toBeDisabled();
  });

  it('в production ссылки нет, а маршрут ведёт на Главную', async () => {
    setDev(false);
    await renderRouter(app, { initialUrl: '/ui-kit' });

    expect(await screen.findByRole('header', { name: 'Главная' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Витрина компонентов' })).toBeNull();
  });
});
