import { t } from '@on-bike/i18n';
import { Banner, Button, keepTogether, TextAction } from '@rkarakulov/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthActions, AuthMeta, AuthText, AuthTitle } from './auth-screen';
import { actionErrorMessage, retryAfterSec } from './error-messages';
import { useRequestPasswordReset } from './queries';
import { prefillSignInEmail } from './verification-states';
import { formatCountdown, useSecondsLeft } from '@/lib/countdown';

// Состояния экрана ссылки сброса пароля (заголовок + текст + действия) — внутри AuthScreen `auth/reset/[token]`.

/** «Войти» с e-mail аккаунта: адрес — через память (черновик), не через URL. */
function useSignInWithEmail(email: string) {
  const router = useRouter();
  return () => {
    prefillSignInEmail(email);
    router.replace('/sign-in');
  };
}

/** Пароль сменён: сессий нет нигде (сервер отозвал все) — вход с новым паролем. */
export function PasswordChanged({ email }: { email: string }) {
  const signIn = useSignInWithEmail(email);
  return (
    <>
      <AuthTitle>{t('auth.reset.doneTitle')}</AuthTitle>
      <AuthText>{t('auth.reset.doneMessage')}</AuthText>
      <AuthActions>
        <Button label={t('auth.signIn.action')} onPress={signIn} />
      </AuthActions>
    </>
  );
}

/** По ссылке пароль уже сменили (повтор, ответ потерялся, другая вкладка). */
export function ResetLinkUsed({ email }: { email: string }) {
  const signIn = useSignInWithEmail(email);
  return (
    <>
      <AuthTitle>{t('auth.reset.usedTitle')}</AuthTitle>
      <AuthText>{t('auth.reset.usedMessage')}</AuthText>
      <AuthActions>
        <Button label={t('auth.signIn.action')} onPress={signIn} />
      </AuthActions>
    </>
  );
}

/** 404: ссылка неизвестна или аккаунт удалён — запросить восстановление заново со «Входа». */
export function ResetLinkGone() {
  const router = useRouter();
  return (
    <>
      <AuthTitle>{t('auth.gone.title')}</AuthTitle>
      <AuthText>{t('auth.reset.goneMessage')}</AuthText>
      <AuthActions>
        <Button label={t('auth.expired.toSignIn')} onPress={() => router.replace('/sign-in')} />
      </AuthActions>
    </>
  );
}

/** Истекла или заменена новой: новая ссылка на e-mail из ответа (владелец ссылки — владелец ящика). */
export function ResetLinkExpired({ email }: { email: string }) {
  const request = useRequestPasswordReset();
  const toSignIn = useSignInWithEmail(email);
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
        <TextAction label={t('auth.expired.toSignIn')} onPress={toSignIn} />
      </AuthActions>
    </>
  );
}
