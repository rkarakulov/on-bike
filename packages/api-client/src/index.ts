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
import { z } from 'zod';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

/** Ошибка API для UI: код из контракта или `UNKNOWN`, если сервер новее клиента или ответил не API. */
export interface ParsedApiError {
  code: ErrorCode | 'UNKNOWN';
  message: string;
  details?: unknown;
}

const LooseApiError = z.object({ message: z.string().optional() });

/** Старые версии приложения живут долго: незнакомый код — не падение, а `UNKNOWN`. */
export function parseApiError(body: unknown): ParsedApiError {
  const known = ApiError.safeParse(body);
  if (known.success) return known.data;
  const loose = LooseApiError.safeParse(body);
  return { code: 'UNKNOWN', message: (loose.success && loose.data.message) || 'Unknown error' };
}

export class ApiHttpError extends Error {
  readonly apiError: ParsedApiError;

  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
    this.apiError = parseApiError(body);
  }
}

/** Запрос не дошёл до сервера (нет сети, DNS, обрыв). Всё остальное — ответ сервера или его форма. */
export class ApiNetworkError extends Error {
  constructor(override readonly cause: unknown) {
    super('Network request failed');
  }
}

/** Единственный признак «нет соединения» для UI (AGENTS.md §4.12); прочие ошибки — «Не удалось загрузить». */
export const isNetworkError = (error: unknown): error is ApiNetworkError =>
  error instanceof ApiNetworkError;

/** Тонкий клиент: каждый ответ валидируется той же zod-схемой, что и на сервере. */
export function createApiClient({ baseUrl, getAccessToken, fetchImpl = fetch }: ApiClientOptions) {
  async function request<S extends z.ZodType>(path: string, schema: S, init?: RequestInit) {
    const token = getAccessToken?.();
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    }).catch((error: unknown) => {
      throw new ApiNetworkError(error);
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw new ApiHttpError(response.status, body);
    return schema.parse(body) as z.infer<S>;
  }

  const get = <S extends z.ZodType>(path: string, schema: S) =>
    request(path, schema, { method: 'GET' });
  const post = <S extends z.ZodType>(path: string, schema: S, body: unknown) =>
    request(path, schema, { method: 'POST', body: JSON.stringify(body) });

  return {
    health: () => request('/v1/health', HealthResponse),
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
