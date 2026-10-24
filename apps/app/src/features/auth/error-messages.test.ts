/// <reference types="jest" />
import { ApiHttpError, ApiNetworkError } from '@on-bike/api-client';

import {
  actionErrorMessage,
  fieldErrorMessage,
  retryAfterSec,
  serverFieldErrors,
  signInErrorMessage,
} from './error-messages';

describe('тексты ошибок', () => {
  it('код поля из контракта → текст прототипа; незнакомый код — общий текст', () => {
    expect(fieldErrorMessage('AGE_BELOW_18')).toBe('Регистрация доступна с 18 лет.');
    expect(fieldErrorMessage('TOO_SHORT')).toBe('Не короче 8 символов.');
    expect(fieldErrorMessage('REQUIRED')).toBe('Заполните поле.');
    expect(fieldErrorMessage('EMAIL_TAKEN')).toBe('Этот e-mail уже зарегистрирован.');
    expect(fieldErrorMessage('EMAIL_UNAVAILABLE')).toBe(
      'Этот e-mail нельзя использовать для регистрации.',
    );
    expect(fieldErrorMessage('SOMETHING_NEW')).toBe('Проверьте значение.');
    expect(fieldErrorMessage(undefined)).toBeUndefined();
  });

  it('ошибка действия: сеть, лимит, неизвестный код сервера — общий текст', () => {
    expect(actionErrorMessage(new ApiNetworkError(null))).toBe(
      'Нет соединения. Проверьте подключение к интернету и повторите.',
    );
    expect(
      actionErrorMessage(
        new ApiHttpError(429, {
          code: 'RATE_LIMITED',
          message: 'x',
          details: { retryAfterSec: 5 },
        }),
      ),
    ).toBe('Слишком много попыток. Попробуйте позже.');
    expect(actionErrorMessage(new ApiHttpError(418, { code: 'TEAPOT', message: 'x' }))).toBe(
      'Что-то пошло не так. Попробуйте ещё раз.',
    );
    expect(actionErrorMessage(new Error('boom'))).toBe('Что-то пошло не так. Попробуйте ещё раз.');
  });

  it('ошибка входа: 401 INVALID_CREDENTIALS — нейтральный текст без подсказок; остальное — как у действий', () => {
    expect(
      signInErrorMessage(
        new ApiHttpError(401, {
          code: 'INVALID_CREDENTIALS',
          message: 'Неверный e-mail или пароль',
        }),
      ),
    ).toBe('Неверный e-mail или пароль.');
    expect(signInErrorMessage(new ApiNetworkError(null))).toBe(
      'Нет соединения. Проверьте подключение к интернету и повторите.',
    );
    expect(signInErrorMessage(new ApiHttpError(500, null))).toBe(
      'Что-то пошло не так. Попробуйте ещё раз.',
    );
  });

  it('retryAfterSec — из details 429, иначе нет', () => {
    const limited = new ApiHttpError(429, {
      code: 'RATE_LIMITED',
      message: 'x',
      details: { retryAfterSec: 42 },
    });
    expect(retryAfterSec(limited)).toBe(42);
    expect(retryAfterSec(new ApiHttpError(500, null))).toBeUndefined();
  });

  it('ошибки полей сервера: только известные поля формы', () => {
    const error = new ApiHttpError(400, {
      code: 'VALIDATION_FAILED',
      message: 'x',
      details: {
        fields: [
          { path: 'birthDate', code: 'AGE_BELOW_18' },
          { path: 'unknown.path', code: 'INVALID' },
        ],
      },
    });
    expect(serverFieldErrors(error, ['email', 'birthDate'])).toEqual([
      { field: 'birthDate', code: 'AGE_BELOW_18' },
    ]);
    expect(serverFieldErrors(new ApiNetworkError(null), ['email'])).toEqual([]);
  });
});
