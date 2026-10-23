import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QUEUE } from '../../queues';
import { AuthController } from './auth.controller';
import { IdentityRepository } from './identity.repository';
import { CleanupUnverifiedProcessor } from './jobs/cleanup-unverified.processor';
import { IdentitySchedules } from './jobs/identity-schedules';
import { VerificationEmailProcessor } from './jobs/verification-email.processor';
import { PasswordHasher } from './password-hasher';
import { RegistrationService } from './registration.service';
import { SessionController } from './session.controller';
import { SessionCookie } from './session-cookie';
import { SessionService } from './session.service';
import { VerificationService } from './verification.service';

/** HTTP-часть identity: регистрация, ссылки подтверждения, обмен токена регистрации на сессию, ротация и выход. */
@Module({
  controllers: [AuthController, SessionController],
  providers: [
    IdentityRepository,
    PasswordHasher,
    SessionService,
    SessionCookie,
    VerificationService,
    RegistrationService,
  ],
})
export class IdentityModule {}

/** Задачи identity в worker: письма подтверждения и ежедневная очистка неподтверждённых. */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE.identityEmail }, { name: QUEUE.identityMaintenance }),
  ],
  providers: [
    IdentityRepository,
    VerificationEmailProcessor,
    CleanupUnverifiedProcessor,
    IdentitySchedules,
  ],
})
export class IdentityWorkerModule {}
