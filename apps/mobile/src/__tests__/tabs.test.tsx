/// <reference types="jest" />
import { palette, size } from '@on-bike/design-tokens';
import { fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { useColorScheme } from 'react-native';

import { tabRoutes } from './app-routes';

// jest-пресет React Native подменяет useColorScheme на jest.fn(() => 'light')
const colorScheme = jest.mocked(useColorScheme);

afterEach(() => colorScheme.mockReturnValue('light'));

describe('нижние вкладки', () => {
  it('пять вкладок в порядке прототипа, Главная выбрана', async () => {
    await renderRouter(tabRoutes);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Главная',
      'Гонки',
      'Райды',
      'Маршруты',
      'Календарь',
    ]);
    expect(screen.getByRole('tab', { name: 'Главная' })).toBeSelected();
  });

  it('нажатие на вкладку открывает раздел и делает её выбранной', async () => {
    await renderRouter(tabRoutes);

    await fireEvent.press(screen.getByRole('tab', { name: 'Райды' }));

    expect(await screen.findByRole('header', { name: 'Кофе-райды' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Райды' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Главная' })).not.toBeSelected();
  });

  it('заголовок раздела — Playfair Display, активная вкладка — ink 600 с полосой', async () => {
    await renderRouter(tabRoutes);

    expect(screen.getByRole('header', { name: 'Главная' })).toHaveStyle({
      fontFamily: 'PlayfairDisplay_600SemiBold',
    });
    const light = palette.jerseyAura;
    expect(screen.getByTestId('tab-indicator-index')).toHaveStyle({
      backgroundColor: light.ink,
      height: size.tabIndicator,
    });
    expect(screen.getByTestId('tab-indicator-races')).toHaveStyle({
      backgroundColor: 'transparent',
    });
    const activeLabel = within(screen.getByRole('tab', { name: 'Главная' })).getByText('Главная');
    expect(activeLabel).toHaveStyle({ fontFamily: 'Inter_600SemiBold', color: light.ink });
    const inactiveLabel = within(screen.getByRole('tab', { name: 'Гонки' })).getByText('Гонки');
    expect(inactiveLabel).toHaveStyle({ color: light.ink2 });
  });

  it('тёмная системная тема → Night Ride на экране и панели вкладок', async () => {
    colorScheme.mockReturnValue('dark');
    await renderRouter(tabRoutes);

    const dark = palette.nightRide;
    expect(screen.getByTestId('tab-bar')).toHaveStyle({ backgroundColor: dark.bg });
    expect(screen.getByTestId('tab-indicator-index')).toHaveStyle({ backgroundColor: dark.ink });
    expect(screen.getByRole('header', { name: 'Главная' })).toHaveStyle({ color: dark.ink });
  });
});
