/// <reference types="jest" />
import { isExpectedResourceError, type ExpectedResourceError } from './console-errors';

const REFRESH = 'http://127.0.0.1:3000/v1/session/refresh';
const httpError = (status: number, url = REFRESH) => ({
  text: `Failed to load resource: the server responded with a status of ${status} (Unauthorized)`,
  url,
});
const refused = (url: string) => ({
  text: 'Failed to load resource: net::ERR_CONNECTION_REFUSED',
  url,
});

const expected: ExpectedResourceError[] = [
  { url: REFRESH, status: 401 },
  { url: /^http:\/\/127\.0\.0\.1:3000\//, status: 'net::ERR_CONNECTION_REFUSED' },
];

describe('isExpectedResourceError: только отказы из списка (URL + статус)', () => {
  it('HTTP-статус: совпадают и URL (точно), и статус', () => {
    expect(isExpectedResourceError(httpError(401), expected)).toBe(true);
    expect(isExpectedResourceError(httpError(403), expected)).toBe(false);
    expect(isExpectedResourceError(httpError(401, `${REFRESH}?x=1`), expected)).toBe(false);
    expect(
      isExpectedResourceError(httpError(500, 'http://127.0.0.1:3000/v1/health'), expected),
    ).toBe(false);
  });

  it('сетевая ошибка Chrome: URL по шаблону и та же ошибка', () => {
    expect(isExpectedResourceError(refused('http://127.0.0.1:3000/v1/health'), expected)).toBe(
      true,
    );
    expect(isExpectedResourceError(refused('http://127.0.0.1:8090/_expo/x.js'), expected)).toBe(
      false,
    );
    const reset = { text: 'Failed to load resource: net::ERR_CONNECTION_RESET', url: REFRESH };
    expect(isExpectedResourceError(reset, expected)).toBe(false);
  });

  it('не отказ загрузки ресурса (исключение, предупреждение React) — не ожидаемая ошибка', () => {
    expect(
      isExpectedResourceError({ text: 'TypeError: x is undefined', url: REFRESH }, expected),
    ).toBe(false);
  });

  it('пустой список — любой отказ загрузки ресурса неожидан', () => {
    expect(isExpectedResourceError(httpError(401), [])).toBe(false);
    expect(isExpectedResourceError(refused(REFRESH), [])).toBe(false);
  });
});
