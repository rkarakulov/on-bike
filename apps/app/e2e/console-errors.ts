// Ошибки загрузки ресурсов в console.error браузера (смоук web): Chrome пишет каждый отказ загрузки как
// «Failed to load resource: …», URL ресурса — в location сообщения. Допустимы только перечисленные явно.

/** Ожидаемый отказ загрузки: URL ресурса (строка — точно, RegExp — шаблон) и HTTP-статус или сетевая ошибка Chrome. */
export interface ExpectedResourceError {
  url: string | RegExp;
  status: number | `net::ERR_${string}`;
}

/** Сообщение console.error для сверки: текст и URL источника (Playwright: `text()`, `location().url`). */
export interface ConsoleError {
  text: string;
  url: string;
}

const RESOURCE_ERROR =
  /^Failed to load resource: (?:the server responded with a status of (\d{3})\b|(net::ERR_[A-Z_]+))/;

/** Сообщение — отказ загрузки ресурса из списка `expected`; любое другое сообщение — не ожидаемое. */
export function isExpectedResourceError(
  { text, url }: ConsoleError,
  expected: readonly ExpectedResourceError[],
): boolean {
  const match = RESOURCE_ERROR.exec(text);
  if (!match) return false;
  const status = match[1] ? Number(match[1]) : match[2];
  return expected.some(
    (item) =>
      item.status === status &&
      (typeof item.url === 'string' ? item.url === url : item.url.test(url)),
  );
}
