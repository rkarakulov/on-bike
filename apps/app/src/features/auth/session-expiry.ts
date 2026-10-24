import type { CookieSession } from '@pokatim/contracts';

/** Сессия жива, пока жив refresh (access — 15 мин); срок refresh знают обе платформы. */
export const isSessionAlive = (session: CookieSession, now: number) =>
  Date.parse(session.refreshTokenExpiresAt) > now;
