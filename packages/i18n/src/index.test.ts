import { describe, expect, it } from 'vitest';

import { interpolate, t } from './index.ts';

describe('t', () => {
  it('возвращает строку по ключу', () => {
    expect(t('tabs.home')).toBe('Главная');
  });
});

describe('interpolate', () => {
  it('подставляет {name} и оставляет неизвестные плейсхолдеры как есть', () => {
    expect(interpolate('Письмо на {email}, ещё {sec} с', { email: 'a@b.by', sec: 42 })).toBe(
      'Письмо на a@b.by, ещё 42 с',
    );
    expect(interpolate('Повтор через {sec} с', {})).toBe('Повтор через {sec} с');
    expect(interpolate('{a}{a}', { a: 1 })).toBe('11');
  });
});
