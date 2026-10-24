/// <reference types="jest" />
import { resolveApiUrl } from './urls';

describe('resolveApiUrl: адрес API смоука = адрес сборки', () => {
  it('env процесса приоритетнее apps/app/.env', () => {
    const dotenv = 'EXPO_PUBLIC_API_URL=http://192.168.1.5:3000\n';
    expect(resolveApiUrl({ EXPO_PUBLIC_API_URL: 'http://127.0.0.1:3999/' }, dotenv)).toBe(
      'http://127.0.0.1:3999',
    );
  });

  it('без env процесса — из apps/app/.env (expo export читает его же)', () => {
    const dotenv = '# комментарий\nPORT=8080\nEXPO_PUBLIC_API_URL="http://192.168.1.5:3000/"\n';
    expect(resolveApiUrl({}, dotenv)).toBe('http://192.168.1.5:3000');
  });

  it('нет ни env, ни переменной в .env (или самого .env) — адрес dev по умолчанию', () => {
    expect(resolveApiUrl({}, 'PORT=8080\n')).toBe('http://127.0.0.1:3000');
    expect(resolveApiUrl({}, undefined)).toBe('http://127.0.0.1:3000');
  });
});
