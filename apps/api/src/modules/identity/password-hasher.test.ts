import { verify } from '@node-rs/argon2';
import { describe, expect, it } from 'vitest';

import { PasswordHasher } from './password-hasher';

describe('PasswordHasher', () => {
  it('argon2id с параметрами OWASP (19 MiB, t=2, p=1), пароль проверяется', async () => {
    const hash = await new PasswordHasher().hash('long-enough');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await verify(hash, 'long-enough')).toBe(true);
    expect(await verify(hash, 'wrong-password')).toBe(false);
  });
});
