import { isNetworkError } from '@on-bike/api-client';
import { t } from '@on-bike/i18n';
import { Banner, Button, keepTogether, TextAction } from '@rkarakulov/ui';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { isRegistrationRejected } from './queries';

import { AuthActions, AuthText, AuthTitle } from './auth-screen';
import { useRegistrationStore } from './registration-store';

// Содержимое экранов (заголовок + текст + действия) — внутри AuthScreen у «Подтвердите e-mail» и у ссылки.

/** «E-mail подтверждён» на устройстве регистрации: держится ~1 с, затем вход без пароля. */
export function VerifiedSigningIn({ email }: { email: string }) {
  return (
    <>
      <AuthTitle>{t('auth.verified.title')}</AuthTitle>
      <AuthText>{t('auth.verified.signingIn', { email: keepTogether(email) })}</AuthText>
    </>
  );
}

/** Подтверждено, но токена регистрации здесь нет (другое устройство) — вход по паролю (слайс 2). */
export function VerifiedElsewhere({ email }: { email: string }) {
  const router = useRouter();
  return (
    <>
      <AuthTitle>{t('auth.verified.title')}</AuthTitle>
      <AuthText>{t('auth.verified.otherDevice', { email: keepTogether(email) })}</AuthText>
      <AuthActions>
        <Button label={t('auth.signIn.action')} onPress={() => router.replace('/sign-in')} />
      </AuthActions>
    </>
  );
}

/** Токен регистрации отклонён (401): истёк или уже обменян (потерянный ответ опроса) — только вход. */
export function SignInRequired() {
  const router = useRouter();
  const signIn = () => {
    router.replace('/sign-in');
    void useRegistrationStore.getState().clear();
  };

  return (
    <>
      <AuthTitle>{t('auth.signInRequired.title')}</AuthTitle>
      <AuthText>{t('auth.signInRequired.message')}</AuthText>
      <AuthActions>
        <Button label={t('auth.signIn.action')} onPress={signIn} />
      </AuthActions>
    </>
  );
}

type PollState = Pick<UseQueryResult<unknown>, 'error' | 'isError' | 'fetchStatus' | 'refetch'>;

/**
 * Проблема опроса подтверждения (AGENTS.md §4.12): без сети — «Нет соединения», ответ сервера —
 * «Не удалось загрузить»; всегда с повтором, контент экрана не прячем. 401 обрабатывает экран («Войдите»).
 */
export function PollProblem({ poll }: { poll: PollState }) {
  const offline = poll.fetchStatus === 'paused';
  if (!offline && (!poll.isError || isRegistrationRejected(poll.error))) return null;
  const server = !offline && !isNetworkError(poll.error);

  return (
    <>
      <Banner
        tone="warning"
        title={t(server ? 'state.failedTitle' : 'state.errorTitle')}
        message={t(server ? 'state.failedMessage' : 'state.errorMessage')}
      />
      <TextAction label={t('state.retry')} onPress={() => void poll.refetch()} />
    </>
  );
}
