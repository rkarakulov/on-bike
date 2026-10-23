import { Body, Controller, Cookies, HttpCode, Ip, Post, Res } from '@nestjs/common';
import {
  FieldErrorCode,
  OpaqueToken,
  RefreshSessionRequest,
  type RefreshSessionResponse,
  SESSION_COOKIE,
  SignOutRequest,
} from '@on-bike/contracts';
import { isDomainError, ZodValidationPipe } from '@rkarakulov/api-kit';

import { domainError } from '../../error-messages';
import { SessionCookie } from './session-cookie';
import { SessionService } from './session.service';

/** Refresh из cookie: мусор и отсутствие — как неизвестный токен, до лимита и БД. */
function cookieToken(value: string | undefined): string | undefined {
  const parsed = OpaqueToken.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Сессия (R4 F5b). Транспорт refresh: `refreshToken` в теле → `body` (native), иначе — cookie `SESSION_COOKIE`
 * (web, ответ без refresh). Тонкий слой: транспорт и заголовки здесь, ротация и отзыв — `SessionService`.
 */
@Controller('auth/session')
export class SessionController {
  constructor(
    private readonly sessions: SessionService,
    private readonly cookie: SessionCookie,
  ) {}

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(RefreshSessionRequest, FieldErrorCode)) body: RefreshSessionRequest,
    @Cookies(SESSION_COOKIE.name) cookieValue: string | undefined,
    @Ip() ip: string,
    @Res({ passthrough: true }) reply: unknown,
  ): Promise<RefreshSessionResponse> {
    this.cookie.noStore(reply);
    if (body.refreshToken !== undefined) return this.sessions.rotate(body.refreshToken, ip);

    try {
      const token = cookieToken(cookieValue);
      if (!token) throw domainError('UNAUTHORIZED', 401);
      return this.cookie.deliver(reply, await this.sessions.rotate(token, ip), 'cookie');
    } catch (error) {
      // недействительная cookie больше не нужна браузеру; 429 и сбои — не повод её стирать
      if (isDomainError(error) && error.status === 401) this.cookie.clear(reply);
      throw error;
    }
  }

  /** Идемпотентно: 204 без тела в любом случае — ответ не говорит, была ли сессия. */
  @Post('sign-out')
  @HttpCode(204)
  async signOut(
    @Body(new ZodValidationPipe(SignOutRequest, FieldErrorCode)) body: SignOutRequest,
    @Cookies(SESSION_COOKIE.name) cookieValue: string | undefined,
    @Res({ passthrough: true }) reply: unknown,
  ): Promise<void> {
    this.cookie.noStore(reply);
    if (body.refreshToken !== undefined) {
      await this.sessions.revoke(body.refreshToken);
      return;
    }
    const token = cookieToken(cookieValue);
    if (token) await this.sessions.revoke(token);
    this.cookie.clear(reply);
  }
}
