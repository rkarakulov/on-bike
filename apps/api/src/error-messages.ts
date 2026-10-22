import type { BaseErrorCode, ErrorCode } from '@on-bike/contracts';
import { DomainError } from '@rkarakulov/api-kit';

/**
 * Тексты кодов ошибок on-bike для фильтра ошибок базы (`API_ERROR_MESSAGES` в AppModule).
 * Коды базы фильтр озвучивает сам; без записи здесь код on-bike получил бы общий текст по статусу.
 */
export const ON_BIKE_ERROR_MESSAGES = {
  EMAIL_TAKEN: 'E-mail уже зарегистрирован',
  EMAIL_UNAVAILABLE: 'E-mail недоступен для регистрации',
  LINK_EXPIRED: 'Ссылка устарела',
} as const satisfies Record<Exclude<ErrorCode, BaseErrorCode>, string>;

/** Ожидаемый отказ бизнес-логики с кодом из контракта: опечатка в коде — ошибка компиляции. */
export const domainError = (code: ErrorCode, status: number, details?: unknown) =>
  new DomainError<ErrorCode>(code, status, details);
