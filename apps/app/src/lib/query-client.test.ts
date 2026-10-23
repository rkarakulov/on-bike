/// <reference types="jest" />
import { ApiHttpError, ApiNetworkError } from '@on-bike/api-client';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

import { connectOnlineManager } from './online-manager';
import { createQueryClient, shouldRetry } from './query-client';

type Listener = Parameters<typeof NetInfo.addEventListener>[0];

describe('QueryClient приложения', () => {
  it('onlineManager следует за NetInfo: без сети запросы встают на паузу (fetchStatus paused)', () => {
    let listener: Listener | undefined;
    jest.mocked(NetInfo.addEventListener).mockImplementation((next) => {
      listener = next;
      return jest.fn();
    });
    connectOnlineManager();
    expect(listener).toBeDefined();

    listener?.({ isConnected: false } as Parameters<Listener>[0]);
    expect(onlineManager.isOnline()).toBe(false);
    listener?.({ isConnected: true } as Parameters<Listener>[0]);
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('повтор — только для сети и 5xx; ответы 4xx окончательны', () => {
    expect(shouldRetry(0, new ApiNetworkError(null))).toBe(true);
    expect(shouldRetry(0, new ApiHttpError(503, null))).toBe(true);
    expect(shouldRetry(2, new ApiHttpError(503, null))).toBe(false);
    expect(shouldRetry(0, new ApiHttpError(404, null))).toBe(false);
    expect(shouldRetry(0, new ApiHttpError(401, null))).toBe(false);
  });

  it('мутации не повторяются сами (действие пользователя может быть не идемпотентным)', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    expect(client.getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });
});
