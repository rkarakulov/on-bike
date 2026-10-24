import { t } from '@on-bike/i18n';
import { Banner, Button, keepTogether, TextAction } from '@rkarakulov/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthActions, AuthMeta, AuthText, AuthTitle } from './auth-screen';
import { actionErrorMessage, retryAfterSec } from './error-messages';
import { useRequestPasswordReset } from './queries';
import { isSignedIn, useSessionStore } from './session-store';
import { useSignOut } from './use-sign-out';
import { prefillSignInEmail } from './verification-states';
import { formatCountdown, useSecondsLeft } from '@/lib/countdown';

// Состояния экрана ссылки сброса пароля (заголовок + текст + действия) — внутри AuthScreen `auth/reset/[token]`.

/**
 * На «Вход» со страницы ссылки сброса. Сессия на этом устройстве ещё есть (ответ смены пароля потерялся, повтор — 410 →
 * `used`; или ссылку открыли, не выходя) — сначала локальный выход: сервер её уже отозвал или отзовёт вход, а гард
 * онбординга вошедшего на «Вход» не пустит. E-mail — через память (черновик), не через URL.
 */
function useToSignIn(email?: string) {
  const router = useRouter();
  const signOut = useSignOut();
  return async () => {
    if (isSignedIn(useSessionStore.getState())) await signOut();
    if (email !== undefined) prefillSignInEmail(email);
    router.replace('/sign-in');
  };
}

/** Пароль сменён: сессий нет нигде (сервер отозвал все) — вход с новым паролем. */
export function PasswordChanged({ email }: { email: string }) {
  const signIn = useToSignIn(email);
  return (
    <>
      <AuthTitle>{t('auth.reset.doneTitle')}</AuthTitle>
      <AuthText>{t('auth.reset.doneMessage')}</AuthText>
      <AuthActions>
        <Button label={t('auth.signIn.action')} onPress={() => void signIn()} />
      </AuthActions>
    </>
  );
}

/** По ссылке пароль уже сменили (повтор, ответ потерялся, другая вкладка). */
export function ResetLinkUsed({ email }: { email: string }) {
  const signIn = useToSignIn(email);
  return (
    <>
      <AuthTitle>{t('auth.reset.usedTitle')}</AuthTitle>
      <AuthText>{t('auth.reset.usedMessage')}</AuthText>
      <AuthActions>
        <Button label={t('auth.signIn.action')} onPress={() => void signIn()} />
      </AuthActions>
    </>
  );
}

/** 404: ссылка неизвестна или аккаунт удалён — запросить восстановление заново со «Входа». */
export function ResetLinkGone() {
  const toSignIn = useToSignIn();
  return (
    <>
      <AuthTitle>{t('auth.gone.title')}</AuthTitle>
      <AuthText>{t('auth.reset.goneMessage')}</AuthText>
      <AuthActions>
        <Button label={t('auth.expired.toSignIn')} onPress={() => void toSignIn()} />
      </AuthActions>
    </>
  );
}

/** Истекла или заменена новой: новая ссылка на e-mail из ответа (владелец ссылки — владелец ящика). */
export function ResetLinkExpired({ email }: { email: string }) {
  const request = useRequestPasswordReset();
  const toSignIn = useToSignIn(email);
  const [nextAt, setNextAt] = useState<number | undefined>();
  const [notice, setNotice] = useState<'sent' | 'tooMany' | null>(null);
  const secondsLeft = useSecondsLeft(nextAt);

  const onResend = async () => {
    setNotice(null);
    try {
      const result = await request.mutateAsync({ email });
      setNextAt(Date.now() + result.resendAvailableInSec * 1000);
      setNotice('sent');
    } catch (error) {
      const wait = retryAfterSec(error);
      if (wait === undefined) return;
      setNextAt(Date.now() + wait * 1000);
      setNotice('tooMany');
    }
  };

  const failed = request.error !== null && retryAfterSec(request.error) === undefined;

  return (
    <>
      <AuthTitle>{t('auth.expired.title')}</AuthTitle>
      <AuthText>{t('auth.reset.expiredMessage', { email: keepTogether(email) })}</AuthText>
      <AuthActions>
        {notice === 'sent' ? (
          <Banner message={t('auth.reset.sent', { email: keepTogether(email) })} />
        ) : null}
        {notice === 'tooMany' ? (
          <Banner tone="warning" message={t('auth.checkEmail.tooMany')} />
        ) : null}
        {failed ? <Banner tone="error" message={actionErrorMessage(request.error)} /> : null}
        <Button
          label={t('auth.reset.resend')}
          onPress={() => void onResend()}
          disabled={secondsLeft > 0}
          loading={request.isPending}
        />
        {secondsLeft > 0 ? (
          <AuthMeta>
            {t('auth.checkEmail.cooldown', { time: formatCountdown(secondsLeft) })}
          </AuthMeta>
        ) : null}
        <TextAction label={t('auth.expired.toSignIn')} onPress={() => void toSignIn()} />
      </AuthActions>
    </>
  );
}
