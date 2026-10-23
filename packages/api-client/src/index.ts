import {
  ApiError,
  ConfirmVerificationResponse,
  type ErrorCode,
  HealthResponse,
  RefreshSessionResponse,
  RegisterResponse,
  RegistrationPollResponse,
  ResendVerificationResponse,
  VerificationLinkInfo,
  type ConfirmVerificationRequest,
  type RefreshSessionRequest,
  type RegisterRequest,
  type RegistrationPollRequest,
  type ResendVerificationRequest,
  type SessionTransport,
  type SignOutRequest,
} from '@on-bike/contracts';
import {
  ApiHttpError,
  createHttpClient,
  parseApiError,
  type ParsedApiError as BaseParsedApiError,
} from '@rkarakulov/api-client-core';
import { z } from 'zod';

export {
  ApiHttpError,
  ApiNetworkError,
  isNetworkError,
  parseApiError,
} from '@rkarakulov/api-client-core';

/** Ошибка API для UI: код из контракта проекта или `UNKNOWN`, если сервер новее клиента или ответил не API. */
export type ParsedApiError = BaseParsedApiError<ErrorCode>;

/**
 * Разобранная ошибка ответа сервера по кодам проекта; `undefined` — ответа не было (сеть, прочее).
 * Разбирает `body` заново: код не зависит от того, кто создал `ApiHttpError` (клиент, тест, другой пакет).
 */
export function apiErrorOf(error: unknown): ParsedApiError | undefined {
  return error instanceof ApiHttpError ? parseApiError(error.body, ApiError) : undefined;
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | undefined;
  fetchImpl?: typeof fetch;
  /** `fetch` credentials каждого запроса; web — `include` (cookie сессии к API на другом origin в dev). */
  credentials?: RequestCredentials;
  /** Как сервер выдаёт сессию (poll): web — `cookie`; не задан — `body` (native). */
  sessionTransport?: SessionTransport;
}

/** Тонкий клиент: каждый ответ валидируется той же zod-схемой, что и на сервере. */
export function createApiClient({
  baseUrl,
  getAccessToken,
  fetchImpl,
  credentials,
  sessionTransport,
}: ApiClientOptions) {
  const { request } = createHttpClient({
    baseUrl,
    getAccessToken,
    fetchImpl,
    errorSchema: ApiError,
  });
  const withCredentials = credentials ? { credentials } : {};
  const get = <S extends z.ZodType>(path: string, schema: S) =>
    request(path, schema, { method: 'GET', ...withCredentials });
  const post = <S extends z.ZodType>(path: string, schema: S, body: unknown) =>
    request(path, schema, { method: 'POST', body: JSON.stringify(body), ...withCredentials });

  return {
    health: () => get('/v1/health', HealthResponse),
    register: (body: RegisterRequest) => post('/v1/auth/register', RegisterResponse, body),
    /** Только чтение: открытие ссылки ничего не меняет на сервере. */
    getVerificationLink: (token: string) =>
      get(`/v1/auth/verification/${encodeURIComponent(token)}`, VerificationLinkInfo),
    confirmVerification: (body: ConfirmVerificationRequest) =>
      post('/v1/auth/verification/confirm', ConfirmVerificationResponse, body),
    resendVerification: (body: ResendVerificationRequest) =>
      post('/v1/auth/verification/resend', ResendVerificationResponse, body),
    pollRegistration: (body: RegistrationPollRequest) =>
      post(
        '/v1/auth/registration/poll',
        RegistrationPollResponse,
        sessionTransport ? { sessionTransport, ...body } : body,
      ),
    /** Ротация сессии: без `refreshToken` — refresh из cookie (web), ответ без него. */
    refreshSession: (body: RefreshSessionRequest = {}) =>
      post('/v1/auth/session/refresh', RefreshSessionResponse, body),
    /** Выход: отзыв сессии (refresh из тела или cookie); ответ 204 без тела. */
    signOut: (body: SignOutRequest = {}) => post('/v1/auth/session/sign-out', z.undefined(), body),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
