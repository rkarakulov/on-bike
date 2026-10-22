import { ArgumentsHost, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { ApiError } from '@on-bike/contracts';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiExceptionFilter } from './api-exception.filter';
import { DomainError } from './domain-error';

function capture(error: unknown) {
  const reply = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    header(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => reply, getRequest: () => ({}) }),
  } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch(error, host);
  return { status: reply.statusCode, headers: reply.headers, body: ApiError.parse(reply.body) };
}

describe('ApiExceptionFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('DomainError — свой статус, код и детали; 429 — с Retry-After', () => {
    const result = capture(new DomainError('RATE_LIMITED', 429, { retryAfterSec: 42 }));
    expect(result.status).toBe(429);
    expect(result.headers['retry-after']).toBe('42');
    expect(result.body).toMatchObject({ code: 'RATE_LIMITED', details: { retryAfterSec: 42 } });
  });

  it('HttpException Nest — код по статусу', () => {
    const result = capture(new NotFoundException());
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('NOT_FOUND');
  });

  it('ошибка Fastify (битый JSON, лишний размер) — 4xx без внутренностей', () => {
    const fastifyError = Object.assign(new Error('Body is not valid JSON but content-type…'), {
      statusCode: 400,
      code: 'FST_ERR_CTP_INVALID_JSON_BODY',
    });
    const result = capture(fastifyError);
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('VALIDATION_FAILED');
    expect(result.body.message).not.toContain('JSON');

    expect(capture(Object.assign(new Error('too large'), { statusCode: 413 })).status).toBe(413);
  });

  it('прочее — 500 INTERNAL без стека, SQL и параметров ни в ответе, ни в логе', () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const cause = Object.assign(new Error('connection terminated'), { code: '57P01' });
    const error = new DrizzleQueryError(
      'insert into "users" ("email") values ($1)',
      ['rider@example.com'],
      cause,
    );

    const result = capture(error);

    expect(result.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(result.body).toEqual({ code: 'INTERNAL', message: expect.any(String) });
    expect(JSON.stringify(result.body)).not.toMatch(/insert|rider@/);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('57P01');
    expect(logged).not.toMatch(/insert|rider@/);
  });
});
