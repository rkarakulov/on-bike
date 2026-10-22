import { z } from 'zod';

/**
 * Сессия: короткий access JWT (15 мин) + refresh (30 дней; на сервере хранится только хеш).
 * Ротация refresh и вход по паролю — слайс 2.
 */
export const Session = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.iso.datetime(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresAt: z.iso.datetime(),
});
export type Session = z.infer<typeof Session>;
