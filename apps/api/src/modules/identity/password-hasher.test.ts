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

  it('verify: верный пароль — true, неверный — false', async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash('long-enough');
    await expect(hasher.verify(hash, 'long-enough')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'Long-enough')).resolves.toBe(false);
  });

  it('verify: битый или пустой хеш — false, не исключение', async () => {
    const hasher = new PasswordHasher();
    await expect(hasher.verify('not-a-hash', 'long-enough')).resolves.toBe(false);
    await expect(hasher.verify('', 'long-enough')).resolves.toBe(false);
  });

  it('пустышка для неизвестного адреса — хеш тех же параметров, ни один пароль к нему не подходит', async () => {
    const hasher = new PasswordHasher();
    const dummy = await hasher.dummyHash();
    expect(dummy).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await hasher.dummyHash()).toBe(dummy);
    await expect(hasher.verify(dummy, '')).resolves.toBe(false);
    await expect(hasher.verify(dummy, 'long-enough')).resolves.toBe(false);
  });
});
