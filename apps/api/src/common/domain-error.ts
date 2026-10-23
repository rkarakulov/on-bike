import type { ErrorCode } from '@on-bike/contracts';

/** Ожидаемый отказ бизнес-логики: глобальный фильтр превращает его в `ApiError` контракта. */
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = 'DomainError';
  }
}
