import { PipeTransform } from '@nestjs/common';
import { FieldErrorCode, type ValidationErrorDetails } from '@on-bike/contracts';
import type { ZodType } from 'zod';

import { DomainError } from './domain-error';

/**
 * Валидация входа схемой из @on-bike/contracts: `@Body(new ZodValidationPipe(RegisterRequest))`.
 * Наружу — только путь и код поля; введённые значения (пароль, e-mail) в ответ не попадают.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const details: ValidationErrorDetails = {
      fields: result.error.issues.map((issue) => {
        const code = FieldErrorCode.safeParse(issue.message);
        return { path: issue.path.join('.'), code: code.success ? code.data : 'INVALID' };
      }),
    };
    throw new DomainError('VALIDATION_FAILED', 400, details);
  }
}
