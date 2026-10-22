import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/** Валидация входа схемой из @on-bike/contracts: `@Body(new ZodValidationPipe(RegisterRequest))`. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Некорректные данные',
        details: result.error.issues,
      });
    }
    return result.data;
  }
}
