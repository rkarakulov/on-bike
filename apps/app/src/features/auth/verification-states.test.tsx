/// <reference types="jest" />
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { EMAIL, NOW, REGISTRATION_TOKEN } from '@/__tests__/auth-fixtures';

import { useRegistrationStore } from './registration-store';
import { SignInRequired } from './verification-states';

jest.mock('@/lib/api');

const HOUR = 3600_000;

function withPending(expiresAt: number) {
  useRegistrationStore.setState({
    pending: {
      registrationToken: REGISTRATION_TOKEN,
      email: EMAIL,
      resendAvailableAt: NOW.getTime(),
      expiresAt,
    },
  });
}

const routes = {
  index: () => <SignInRequired />,
  'sign-in': () => <Text>sign-in</Text>,
  register: () => <Text>register</Text>,
};

beforeEach(() => jest.useFakeTimers({ now: NOW }));
afterEach(() => jest.useRealTimers());

describe('SignInRequired — токен регистрации отклонён (R7)', () => {
  it('локальный срок не истёк (ответ опроса потерялся) — «E-mail подтверждён. Войдите с паролем.», e-mail подставлен', async () => {
    withPending(NOW.getTime() + HOUR);
    const router = await renderRouter(routes, { initialUrl: '/' });

    expect(screen.getByRole('header', { name: 'Войдите в аккаунт' })).toBeOnTheScreen();
    expect(screen.getByText('E-mail подтверждён. Войдите с паролем.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Зарегистрироваться заново' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Войти' }));

    expect(router.getPathname()).toBe('/sign-in');
    expect(useRegistrationStore.getState()).toMatchObject({
      pending: null,
      draft: { email: EMAIL },
    });
  });

  it('локальный срок истёк — «Регистрация устарела»: вход или регистрация заново', async () => {
    withPending(NOW.getTime() - 1);
    const router = await renderRouter(routes, { initialUrl: '/' });

    expect(screen.getByRole('header', { name: 'Регистрация устарела' })).toBeOnTheScreen();
    expect(screen.getByText('Войдите или зарегистрируйтесь заново.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Зарегистрироваться заново' }));
    expect(router.getPathname()).toBe('/register');
  });
});
