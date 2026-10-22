import { baseMessages } from '@rkarakulov/i18n-core';
import { describe, expect, it } from 'vitest';

import { messages, t } from './index.ts';
import { ru } from './ru.ts';

describe('t', () => {
  it('возвращает строку on-bike по ключу', () => {
    expect(t('tabs.home')).toBe('Главная');
  });

  it('строки базы доступны через тот же t', () => {
    expect(t('state.retry')).toBe('Повторить');
    expect(t('date.long', { day: 14, month: t('date.month.3'), year: 1991 })).toBe('14 марта 1991');
  });

  it('плейсхолдеры подставляются, как раньше', () => {
    expect(t('auth.field.TOO_SHORT', { min: 8 })).toBe('Не короче 8 символов.');
  });
});

describe('словарь on-bike', () => {
  it('не повторяет строки базы: ключ базы с тем же текстом — дубль', () => {
    const base: Record<string, unknown> = baseMessages.ru;
    const duplicates = Object.entries(ru)
      .filter(([key, text]) => base[key] === text)
      .map(([key]) => key)
      // витрина: ключи uiKit.* уходят вместе со старой витриной (F4, S4)
      .filter((key) => !key.startsWith('uiKit.'));
    expect(duplicates).toEqual([]);
  });

  it('слит с базой: все ключи базы и on-bike', () => {
    expect(Object.keys(messages)).toEqual(
      expect.arrayContaining([...Object.keys(baseMessages.ru), ...Object.keys(ru)]),
    );
  });
});
