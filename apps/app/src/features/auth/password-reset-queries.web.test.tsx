/// <reference types="jest" />
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { api } from '@/lib/api';

import { useConfirmPasswordReset, useRequestPasswordReset } from './queries';
import { SESSION_LOCK } from './session-lock.web';

jest.mock('@/lib/api', () => ({
  api: { requestPasswordReset: jest.fn(), confirmPasswordReset: jest.fn() },
}));

const TOKEN = 'L'.repeat(43);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('запросы сброса пароля (web)', () => {
  const request = jest.fn((_name: string, task: () => Promise<unknown>) => task());

  beforeEach(() => {
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
    jest.mocked(api.requestPasswordReset).mockResolvedValue({ resendAvailableInSec: 60 });
    jest
      .mocked(api.confirmPasswordReset)
      .mockResolvedValue({ state: 'passwordChanged', email: 'a@b.by' });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'locks');
    jest.clearAllMocks();
  });

  it(`не под замком сессии ${SESSION_LOCK}: cookie сессии эти пути не видят и не меняют`, async () => {
    const requestHook = renderHook(() => useRequestPasswordReset(), { wrapper });
    const confirmHook = renderHook(() => useConfirmPasswordReset(), { wrapper });

    await act(async () => {
      await requestHook.result.current.mutateAsync({ email: 'a@b.by' });
      await confirmHook.result.current.mutateAsync({ token: TOKEN, password: 'long-enough' });
    });

    expect(api.requestPasswordReset).toHaveBeenCalledWith({ email: 'a@b.by' });
    expect(api.confirmPasswordReset).toHaveBeenCalledWith({
      token: TOKEN,
      password: 'long-enough',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('офлайн мутации не ставятся на паузу (networkMode: always)', async () => {
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper });
    onlineManager.setOnline(false);
    try {
      await act(async () => {
        await result.current.mutateAsync({ email: 'a@b.by' });
      });
      expect(api.requestPasswordReset).toHaveBeenCalledTimes(1);
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
