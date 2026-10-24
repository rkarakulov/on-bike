// @vitest-environment jsdom
import { ApiHttpError, ApiNetworkError } from '@pokatim/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { App } from './App';

vi.mock('./api', () => ({ api: { health: vi.fn() } }));
const health = vi.mocked(api.health);

const ok = { status: 'ok' as const, version: 'dev', checks: { database: 'up' as const } };

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
  return client;
}

afterEach(() => {
  cleanup();
  health.mockReset();
});

describe('статус API (AGENTS.md §4.12)', () => {
  it('заголовок виден сразу, на загрузке — скелетон с высотой строки', () => {
    health.mockReturnValue(new Promise(() => undefined));
    renderApp();

    expect(screen.getByRole('heading', { name: 'Панель организатора' })).toBeTruthy();
    const skeleton = screen.getByRole('progressbar', { name: 'Загрузка' });
    expect(skeleton.className).toContain('skeleton');
    expect(skeleton.textContent).toBe(' ');
  });

  it('сетевая ошибка — сообщение о соединении и повтор', async () => {
    health
      .mockRejectedValueOnce(new ApiNetworkError(new TypeError('Failed to fetch')))
      .mockResolvedValueOnce(ok);
    renderApp();

    expect(await screen.findByText(/Проверьте подключение к интернету/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Работает')).toBeTruthy();
  });

  it('статус API — текстом словаря, а не кодом ответа', async () => {
    health.mockResolvedValueOnce({ ...ok, status: 'degraded', checks: { database: 'down' } });
    renderApp();
    expect(await screen.findByText('Работает с ограничениями')).toBeTruthy();
    expect(screen.queryByText('degraded')).toBeNull();
  });

  it('ответ неожиданной формы — тоже сервер, не сеть', async () => {
    health.mockRejectedValueOnce(new Error('Invalid input'));
    renderApp();
    expect(await screen.findByText(/Сервис временно недоступен/)).toBeTruthy();
  });

  it('ошибка сервера — «Сервис временно недоступен»', async () => {
    health.mockRejectedValueOnce(new ApiHttpError(503, null));
    renderApp();
    expect(await screen.findByText(/Сервис временно недоступен/)).toBeTruthy();
  });

  it('ошибка обновления: данные остаются, есть повтор', async () => {
    health
      .mockResolvedValueOnce(ok)
      .mockRejectedValueOnce(new ApiNetworkError(new TypeError('offline')))
      .mockResolvedValueOnce(ok);
    const client = renderApp();
    expect(await screen.findByText('Работает')).toBeTruthy();

    await client.refetchQueries({ queryKey: ['health'] }).catch(() => undefined);
    expect(await screen.findByText('Данные могли устареть')).toBeTruthy();
    expect(screen.getByText('Работает')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(health).toHaveBeenCalledTimes(3);
  });
});
