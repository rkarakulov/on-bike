import { Body, Controller, Get, Header, HttpCode, Ip, Param, Post } from '@nestjs/common';
import {
  ConfirmVerificationRequest,
  type ConfirmVerificationResponse,
  RegisterRequest,
  type RegisterResponse,
  RegistrationPollRequest,
  type RegistrationPollResponse,
  ResendVerificationRequest,
  type ResendVerificationResponse,
  type VerificationLinkInfo,
  VerificationToken,
} from '@on-bike/contracts';

import { DomainError } from '../../common/domain-error';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';

/** Публичные эндпоинты регистрации. Тонкий слой: контракт → сервис. Ответы с токенами не кешируются. */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registration: RegistrationService,
    private readonly verification: VerificationService,
  ) {}

  @Post('register')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  register(
    @Body(new ZodValidationPipe(RegisterRequest)) body: RegisterRequest,
    @Ip() ip: string,
  ): Promise<RegisterResponse> {
    return this.registration.register(body, ip);
  }

  /** Открытие ссылки ничего не меняет. Мусор вместо токена — как неизвестный токен (404). */
  @Get('verification/:token')
  @Header('Cache-Control', 'no-store')
  describeLink(@Param('token') token: string): Promise<VerificationLinkInfo> {
    if (!VerificationToken.safeParse(token).success) throw new DomainError('NOT_FOUND', 404);
    return this.verification.describeLink(token);
  }

  @Post('verification/confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  confirm(
    @Body(new ZodValidationPipe(ConfirmVerificationRequest)) body: ConfirmVerificationRequest,
  ): Promise<ConfirmVerificationResponse> {
    return this.verification.confirm(body.token);
  }

  @Post('verification/resend')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  resend(
    @Body(new ZodValidationPipe(ResendVerificationRequest)) body: ResendVerificationRequest,
  ): Promise<ResendVerificationResponse> {
    return this.verification.resend(body);
  }

  @Post('registration/poll')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  poll(
    @Body(new ZodValidationPipe(RegistrationPollRequest)) body: RegistrationPollRequest,
  ): Promise<RegistrationPollResponse> {
    return this.registration.poll(body.registrationToken);
  }
}
