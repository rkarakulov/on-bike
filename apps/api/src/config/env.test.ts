import { describe, expect, it } from 'vitest';

import { testEnv } from '../../test/test-env';

describe('env', () => {
  it('APP_LINK_BASE: схема приложения или Expo Go, всегда с завершающим слешем', () => {
    expect(testEnv({ APP_LINK_BASE: 'onbike://' }).APP_LINK_BASE).toBe('onbike://');
    expect(testEnv({ APP_LINK_BASE: 'exp://127.0.0.1:8081/--/' }).APP_LINK_BASE).toBe(
      'exp://127.0.0.1:8081/--/',
    );
    expect(() => testEnv({ APP_LINK_BASE: 'exp://127.0.0.1:8081/--' })).toThrow();
  });

  it('секреты короче 32 символов не принимаются', () => {
    expect(() => testEnv({ JWT_SECRET: 'short' })).toThrow();
    expect(() => testEnv({ EMAIL_TOKEN_SECRET: 'short' })).toThrow();
  });

  it('TRUST_PROXY — число доверенных прокси; старые true/false → 1/0', () => {
    expect(testEnv({ TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
    expect(testEnv({ TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(1);
    expect(testEnv({ TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(0);
    expect(() => testEnv({ TRUST_PROXY: '-1' })).toThrow();
  });
});
