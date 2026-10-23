import { Injectable } from '@nestjs/common';
import { hash } from '@node-rs/argon2';

/** argon2id (алгоритм по умолчанию в @node-rs/argon2), параметры OWASP: 19 MiB, 2 прохода, 1 поток. */
@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }
}
