import { ru } from './ru.ts';

export type Messages = typeof ru;
export type MessageKey = keyof Messages;
export type MessageParams = Record<string, string | number>;

/** Подставляет `{name}` из `params`; неизвестный плейсхолдер остаётся видимым — так проще заметить ошибку. */
export function interpolate(template: string, params: MessageParams): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

/** Пока один язык. Ключи типизированы: опечатка в ключе — ошибка typecheck. */
export function t(key: MessageKey, params?: MessageParams): string {
  return params ? interpolate(ru[key], params) : ru[key];
}

export { ru };
