/// <reference types="jest" />
import { useFonts } from 'expo-font';
import { renderRouter, screen } from 'expo-router/testing-library';
import * as SplashScreen from 'expo-splash-screen';

import RootLayout from '../app/_layout';
import { tabRoutes } from './app-routes';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const mockedUseFonts = jest.mocked(useFonts);
const app = { _layout: RootLayout, ...tabRoutes };

afterEach(() => jest.clearAllMocks());

describe('корневой layout: splash и шрифты', () => {
  it('splash удерживается при старте модуля, до первого рендера', () => {
    // вызов на уровне модуля — проверяем до первого clearAllMocks
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
  });

  it('пока шрифты грузятся — splash не скрыт и экран не рендерится', async () => {
    mockedUseFonts.mockReturnValue([false, null]);
    await renderRouter(app);

    expect(screen.queryByRole('tab', { name: 'Главная' })).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('шрифты загружены — splash скрыт, открыта Главная', async () => {
    mockedUseFonts.mockReturnValue([true, null]);
    await renderRouter(app);

    expect(await screen.findByRole('header', { name: 'Главная' })).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('ошибка шрифтов не блокирует запуск и пишется в лог', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedUseFonts.mockReturnValue([false, new Error('font failed')]);
    await renderRouter(app);

    expect(await screen.findByRole('header', { name: 'Главная' })).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('font failed'));
    warn.mockRestore();
  });
});
