import { t } from '@on-bike/i18n';
import { Banner, Button, keepTogether, TextAction } from '@rkarakulov/ui';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  AuthActions,
  AuthInline,
  AuthMeta,
  AuthScreen,
  AuthText,
} from '@/features/auth/auth-screen';
import { actionErrorMessage, retryAfterSec } from '@/features/auth/error-messages';
import {
  isRegistrationRejected,
  useRegistrationPoll,
  useResendVerification,
} from '@/features/auth/queries';
import { useRegistrationStore, type PendingRegistration } from '@/features/auth/registration-store';
import {
  PollProblem,
  SignInRequired,
  VerifiedSigningIn,
} from '@/features/auth/verification-states';
import { useSignInWhenVerified } from '@/features/auth/use-sign-in-when-verified';
import { formatCountdown, useSecondsLeft } from '@/lib/countdown';

export default function CheckEmailScreen() {
  const pending = useRegistrationStore((state) => state.pending);
  if (!pending) return <Redirect href="/register" />;
  return <CheckEmail pending={pending} />;
}

type ResendNotice = 'resent' | 'tooMany' | null;

/** «Подтвердите e-mail»: ждёт подтверждения опросом и входит без пароля (V-09). */
function CheckEmail({ pending }: { pending: PendingRegistration }) {
  const router = useRouter();
  const poll = useRegistrationPoll(pending.registrationToken);
  const resend = useResendVerification();
  const [notice, setNotice] = useState<ResendNotice>(null);
  const secondsLeft = useSecondsLeft(pending.resendAvailableAt);
  useSignInWhenVerified(poll.data);

  if (poll.data?.state === 'verified') {
    return (
      <AuthScreen kicker={t('auth.kicker')}>
        <VerifiedSigningIn email={pending.email} />
      </AuthScreen>
    );
  }
  if (isRegistrationRejected(poll.error) || isRegistrationRejected(resend.error)) {
    return (
      <AuthScreen kicker={t('auth.kicker')}>
        <SignInRequired />
      </AuthScreen>
    );
  }

  const onResend = async () => {
    setNotice(null);
    try {
      const result = await resend.mutateAsync({ registrationToken: pending.registrationToken });
      if ('state' in result) {
        // адрес уже подтверждён (например, на другом устройстве) — опрос сразу заберёт сессию
        void poll.refetch();
        return;
      }
      await useRegistrationStore.getState().resent(result.resendAvailableInSec);
      setNotice('resent');
    } catch (error) {
      const wait = retryAfterSec(error);
      if (wait === undefined) return;
      await useRegistrationStore.getState().pauseResend(wait);
      setNotice('tooMany');
    }
  };

  const backToRegister = () => (router.canGoBack() ? router.back() : router.replace('/register'));
  const failed = resend.error !== null && retryAfterSec(resend.error) === undefined;

  return (
    <AuthScreen kicker={t('auth.kicker')} title={t('auth.checkEmail.title')}>
      <AuthText>{t('auth.checkEmail.message', { email: keepTogether(pending.email) })}</AuthText>
      <AuthText tone="secondary">{t('auth.checkEmail.hint')}</AuthText>
      <AuthActions>
        <PollProblem poll={poll} />
        {notice === 'resent' ? <Banner message={t('auth.checkEmail.resent')} /> : null}
        {notice === 'tooMany' ? (
          <Banner tone="warning" message={t('auth.checkEmail.tooMany')} />
        ) : null}
        {failed ? <Banner tone="error" message={actionErrorMessage(resend.error)} /> : null}
        <Button
          variant="secondary"
          // подпись статична, отсчёт — отдельной мета-строкой (не живой регион)
          label={t(notice === 'resent' ? 'auth.checkEmail.resendAgain' : 'auth.checkEmail.resend')}
          onPress={() => void onResend()}
          disabled={secondsLeft > 0}
          loading={resend.isPending}
        />
        {secondsLeft > 0 ? (
          <AuthMeta>
            {t('auth.checkEmail.cooldown', { time: formatCountdown(secondsLeft) })}
          </AuthMeta>
        ) : null}
        <AuthInline>
          <AuthMeta>{t('auth.checkEmail.wrongEmail')}</AuthMeta>
          <TextAction label={t('auth.checkEmail.backToRegister')} onPress={backToRegister} />
        </AuthInline>
      </AuthActions>
    </AuthScreen>
  );
}
