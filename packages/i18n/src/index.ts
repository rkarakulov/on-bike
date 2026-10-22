import { ru } from './ru.ts';

export type Messages = typeof ru;
export type MessageKey = keyof Messages;

/** Пока один язык. Ключи типизированы: опечатка в ключе — ошибка typecheck. */
export function t(key: MessageKey): string {
  return ru[key];
}

export { ru };
