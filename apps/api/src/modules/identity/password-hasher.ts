import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';

/** argon2id (алгоритм по умолчанию в @node-rs/argon2), параметры OWASP: 19 MiB, 2 прохода, 1 поток. */
const PARAMS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordHasher {
  private dummy: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return hash(password, PARAMS);
  }

  /** Параметры берутся из самого хеша; битый хеш — `false`, не исключение (ответ — тот же 401). */
  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Хеш-пустышка тех же параметров для неизвестного и удалённого адреса: вход тратит на проверку то же время, и
   * время ответа не выдаёт, есть ли аккаунт. Пароль — случайный и нигде не хранится: к пустышке не подходит ни один
   * пароль. Считается один раз на процесс.
   */
  dummyHash(): Promise<string> {
    this.dummy ??= this.hash(randomBytes(32).toString('base64url'));
    return this.dummy;
  }
}
