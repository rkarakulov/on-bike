/// <reference types="jest" />
import { createApiClient } from '@on-bike/api-client';

import { apiPlatformOptions } from './api-platform';
import './api';

jest.mock('@on-bike/api-client', () => ({ createApiClient: jest.fn(() => ({})) }));

describe('клиент API (web)', () => {
  it('refresh — в httpOnly cookie: credentials include, транспорт сессии cookie', () => {
    expect(apiPlatformOptions).toEqual({ credentials: 'include', sessionTransport: 'cookie' });
  });

  it('lib/api создаёт клиент с адресом API и опциями платформы', () => {
    expect(createApiClient).toHaveBeenCalledWith({
      baseUrl: expect.any(String),
      credentials: 'include',
      sessionTransport: 'cookie',
    });
  });
});
