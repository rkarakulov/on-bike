/// <reference types="jest" />
import { createApiClient } from '@on-bike/api-client';

import { apiPlatformOptions } from './api-platform';
import './api';

jest.mock('@on-bike/api-client', () => ({ createApiClient: jest.fn(() => ({})) }));

describe('клиент API (native)', () => {
  it('сессия — в теле ответа (SecureStore), cookie не нужны', () => {
    expect(apiPlatformOptions).toEqual({});
  });

  it('lib/api создаёт клиент с адресом API и опциями платформы', () => {
    expect(createApiClient).toHaveBeenCalledWith({ baseUrl: expect.any(String) });
  });
});
