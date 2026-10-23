import {
  ApiError,
  ConfirmVerificationResponse,
  type ErrorCode,
  HealthResponse,
  RegisterResponse,
  RegistrationPollResponse,
  ResendVerificationResponse,
  VerificationLinkInfo,
  type ConfirmVerificationRequest,
  type RegisterRequest,
  type RegistrationPollRequest,
  type ResendVerificationRequest,
} from '@on-bike/contracts';
import {
  ApiHttpError,
  createHttpClient,
  parseApiError,
  type ParsedApiError as BaseParsedApiError,
} from '@rkarakulov/api-client-core';

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
}

/** Тонкий клиент: каждый ответ валидируется той же zod-схемой, что и на сервере. */
export function createApiClient({ baseUrl, getAccessToken, fetchImpl }: ApiClientOptions) {
  const { get, post } = createHttpClient({
    baseUrl,
    getAccessToken,
    fetchImpl,
    errorSchema: ApiError,
  });

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
      post('/v1/auth/registration/poll', RegistrationPollResponse, body),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
