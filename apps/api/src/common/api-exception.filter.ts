import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { RateLimitedDetails, type ApiError, type ErrorCode } from '@on-bike/contracts';

import { DomainError } from './domain-error';

/** Минимум ответа Fastify, нужный фильтру (без зависимости от типов fastify). */
interface Reply {
  status(code: number): Reply;
  header(name: string, value: string): Reply;
  send(body: unknown): unknown;
}

const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_FAILED: 'Некорректные данные',
  UNAUTHORIZED: 'Требуется авторизация',
  FORBIDDEN: 'Доступ запрещён',
  NOT_FOUND: 'Не найдено',
  CONFLICT: 'Конфликт',
  RATE_LIMITED: 'Слишком много запросов',
  INTERNAL: 'Внутренняя ошибка',
  EMAIL_TAKEN: 'E-mail уже зарегистрирован',
  EMAIL_UNAVAILABLE: 'E-mail недоступен для регистрации',
  LINK_EXPIRED: 'Ссылка устарела',
};

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
    case 405:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL' : 'VALIDATION_FAILED';
  }
}

/** Ошибки Fastify (битый JSON, неподдерживаемый content-type, размер тела) несут `statusCode`. */
function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return undefined;
  const { statusCode } = error;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500
    ? statusCode
    : undefined;
}

/** Для лога: имя ошибки и код драйвера БД. Сообщение DrizzleQueryError содержит SQL и параметры — не пишем. */
function describeForLog(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  const cause = error.cause;
  const causeCode =
    typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : undefined;
  return causeCode ? `${error.name} (cause code ${causeCode})` : error.name;
}

/** Единый формат ошибок API — `ApiError` из contracts; стек, SQL и тело запроса наружу не уходят. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<Reply>();
    const { status, body } = this.toApiError(exception);
    if (body.code === 'RATE_LIMITED') {
      const details = RateLimitedDetails.safeParse(body.details);
      if (details.success) reply.header('Retry-After', String(details.data.retryAfterSec));
    }
    reply.status(status).send(body);
  }

  private toApiError(exception: unknown): { status: number; body: ApiError } {
    if (exception instanceof DomainError) {
      const body: ApiError = { code: exception.code, message: MESSAGES[exception.code] };
      if (exception.details !== undefined) body.details = exception.details;
      return { status: exception.status, body };
    }
    const status =
      exception instanceof HttpException ? exception.getStatus() : clientErrorStatus(exception);
    if (status !== undefined && status < 500) {
      const code = codeForStatus(status);
      return { status, body: { code, message: MESSAGES[code] } };
    }
    // только кадры стека: начало stack повторяет сообщение (у DrizzleQueryError — SQL с параметрами)
    const frames =
      exception instanceof Error
        ? exception.stack
            ?.split('\n')
            .filter((line) => /^\s+at /.test(line))
            .join('\n')
        : undefined;
    this.logger.error(`unhandled ${describeForLog(exception)}`, frames);
    return { status: 500, body: { code: 'INTERNAL', message: MESSAGES.INTERNAL } };
  }
}
