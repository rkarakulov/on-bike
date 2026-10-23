/// <reference types="jest" />
import { ApiHttpError } from '@on-bike/api-client';
import type { HealthResponse } from '@on-bike/contracts';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { api } from '@/lib/api';

import StatusScreen from '../app/status';
import { createQueryWrapper } from './query-wrapper';

jest.mock('@/lib/api', () => ({ api: { health: jest.fn() } }));
const health = jest.mocked(api.health);

const ok: HealthResponse = { status: 'ok', version: 'dev', checks: { database: 'up' } };

// native: данных loader нет (useLoaderSeed → undefined) — экран берёт данные из API
const renderStatus = () =>
  renderRouter({ status: StatusScreen }, { initialUrl: '/status', wrapper: createQueryWrapper() });

afterEach(() => health.mockReset());

// iOS dev client и сборки: нативный модуль ExpoHead есть (мок в jest.setup.ts) — `expo-router/head` в экране
// без `origin` у плагина expo-router бросил бы ошибку; заголовок вкладки — только в `.web`-файле
const expoModules = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo?.modules;

describe('публичный экран «Статус сервиса»', () => {
  it('заголовок сразу, на загрузке — скелетон', async () => {
    health.mockReturnValue(new Promise(() => undefined));
    await renderStatus();

    expect(screen.getByRole('header', { name: 'Статус сервиса' })).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Загрузка' })).toBeOnTheScreen();
  });

  it('с нативным ExpoHead (iOS dev client) экран открывается', async () => {
    expect(expoModules?.ExpoHead).toBeDefined();
    health.mockResolvedValue(ok);
    await renderStatus();

    expect(screen.getByRole('header', { name: 'Статус сервиса' })).toBeOnTheScreen();
    expect(await screen.findByText('Работает')).toBeOnTheScreen();
  });

  it('данные API: статус', async () => {
    health.mockResolvedValue(ok);
    await renderStatus();

    expect(await screen.findByText('Работает')).toBeOnTheScreen();
    expect(health).toHaveBeenCalledTimes(1);
  });

  it('ошибка — «Не удалось загрузить» и повтор', async () => {
    health.mockRejectedValueOnce(new ApiHttpError(503, null));
    health.mockResolvedValueOnce({ ...ok, status: 'degraded', checks: { database: 'down' } });
    await renderStatus();

    expect(await screen.findByText('Не удалось загрузить')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Работает с ограничениями')).toBeOnTheScreen();
  });
});
