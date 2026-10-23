import { baseMessages, createI18n, mergeDictionaries, type Params } from '@rkarakulov/i18n-core';

import { ru } from './ru.ts';

/** Строки базы (состояния загрузки, даты, поля) + строки on-bike; ключи on-bike переопределяют базу. */
export const messages = mergeDictionaries(baseMessages.ru, ru);

export type Messages = typeof messages;
export type MessageKey = keyof Messages & string;
export type MessageParams = Params;

/** Пока один язык (ru). Экземпляр нужен дизайн-системе (`configureDesignSystem({ i18n })`). */
export const i18n = createI18n({ baseLocale: 'ru', base: messages });

/** Ключи типизированы: опечатка в ключе — ошибка typecheck. */
export function t(key: MessageKey, params?: MessageParams): string {
  return i18n.t(key, params);
}

export { interpolate } from '@rkarakulov/i18n-core';
