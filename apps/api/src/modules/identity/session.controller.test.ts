import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

import { SessionController } from './session.controller';
import type { SessionCookie } from './session-cookie';
import type { SessionService } from './session.service';

function createController() {
  const sessions = { rotate: vi.fn(), revoke: vi.fn() };
  const cookie = { deliver: vi.fn(), clear: vi.fn(), noStore: vi.fn() };
  const controller = new SessionController(
    sessions as unknown as SessionService,
    cookie as unknown as SessionCookie,
  );
  return { controller, sessions, cookie };
}

describe('SessionController: cookie валидируется схемой до сервиса', () => {
  it('refresh без cookie → 401 без сброса: запоздалый ответ не сотрёт cookie, выданную тем временем poll', async () => {
    const { controller, sessions, cookie } = createController();

    await expect(controller.refresh({}, undefined, '1.2.3.4', {})).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
    expect(sessions.rotate).not.toHaveBeenCalled();
    expect(cookie.noStore).toHaveBeenCalled();
    expect(cookie.clear).not.toHaveBeenCalled();
  });

  it.each([
    ['пустая cookie', ''],
    ['мусор', 'not-a-token'],
    ['почти токен (42 символа)', 'a'.repeat(42)],
  ])(
    'refresh, %s → 401 и сброс cookie, без ротации (ни лимита, ни запроса в БД)',
    async (_case, value) => {
      const { controller, sessions, cookie } = createController();

      await expect(controller.refresh({}, value, '1.2.3.4', {})).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
      expect(sessions.rotate).not.toHaveBeenCalled();
      expect(cookie.noStore).toHaveBeenCalled();
      expect(cookie.clear).toHaveBeenCalled();
    },
  );

  it('sign-out с мусором в cookie → без отзыва, cookie сброшена', async () => {
    const { controller, sessions, cookie } = createController();

    await expect(controller.signOut({}, 'not-a-token', {})).resolves.toBeUndefined();
    expect(sessions.revoke).not.toHaveBeenCalled();
    expect(cookie.clear).toHaveBeenCalled();
  });
});
