import { normalizeEmail, type VerificationLinkState } from '@on-bike/contracts';
import { size } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import {
  AsyncContent,
  Banner,
  Button,
  keepTogether,
  Skeleton,
  SkeletonText,
  TextAction,
} from '@rkarakulov/ui';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  AuthActions,
  AuthMeta,
  AuthScreen,
  AuthStack,
  AuthText,
  AuthTitle,
} from '@/features/auth/auth-screen';
import {
  actionErrorMessage,
  apiErrorCode,
  linkExpiredEmail,
  retryAfterSec,
} from '@/features/auth/error-messages';
import {
  isRegistrationRejected,
  useConfirmVerification,
  useRegistrationPoll,
  useResendVerification,
  useVerificationLink,
} from '@/features/auth/queries';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { isSignedIn, useSessionStore } from '@/features/auth/session-store';
import { useSignInWhenVerified } from '@/features/auth/use-sign-in-when-verified';
import {
  SignInRequired,
  PollProblem,
  VerifiedElsewhere,
  VerifiedSigningIn,
} from '@/features/auth/verification-states';
import { formatCountdown, useSecondsLeft } from '@/lib/countdown';

type LinkView = { state: VerificationLinkState | 'gone'; email: string };

const isGone = (error: unknown) => apiErrorCode(error) === 'NOT_FOUND';

/**
 * Ссылка из письма `…/auth/verify/<token>`. Открытие только читает состояние (GET);
 * аккаунт активируется нажатием «Подтвердить e-mail» (POST, C2).
 */
export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const link = useVerificationLink(token);
  // результат действий на экране важнее первого ответа GET
  const [override, setOverride] = useState<LinkView | null>(null);

  if (override?.state === 'gone' || isGone(link.error)) {
    return (
      <AuthScreen kicker={t('auth.kicker')}>
        <LinkGone />
      </AuthScreen>
    );
  }

  // шапка сценария видна сразу; заголовок зависит от состояния ссылки — до ответа на его месте скелетон
  return (
    <AuthScreen kicker={t('auth.kicker')}>
      <AsyncContent query={link} skeleton={<LinkSkeleton />}>
        {(info) => {
          const view = override ?? info;
          switch (view.state) {
            case 'valid':
              return <ConfirmLink token={token} email={view.email} onResult={setOverride} />;
            case 'expired':
              return <ExpiredLink token={token} email={view.email} onResult={setOverride} />;
            default:
              return <VerifiedLink email={view.email} />;
          }
        }}
      </AsyncContent>
    </AuthScreen>
  );
}

function LinkSkeleton() {
  return (
    <AuthStack>
      <SkeletonText variant="displayTitle" lastLineWidth="70%" />
      <SkeletonText lines={2} />
      <Skeleton height={size.buttonHeight} />
    </AuthStack>
  );
}

interface LinkStateProps {
  token: string;
  email: string;
  onResult: (view: LinkView) => void;
}

function ConfirmLink({ token, email, onResult }: LinkStateProps) {
  const confirm = useConfirmVerification();

  const onConfirm = async () => {
    try {
      const result = await confirm.mutateAsync(token);
      onResult({ state: 'verified', email: result.email });
    } catch (error) {
      if (isGone(error)) onResult({ state: 'gone', email });
      if (apiErrorCode(error) === 'LINK_EXPIRED') {
        onResult({ state: 'expired', email: linkExpiredEmail(error) ?? email });
      }
    }
  };

  const failureCode = apiErrorCode(confirm.error);
  const failed =
    confirm.error !== null && failureCode !== 'LINK_EXPIRED' && failureCode !== 'NOT_FOUND';

  return (
    <>
      <AuthTitle>{t('auth.verify.title')}</AuthTitle>
      <AuthText>{t('auth.verify.message', { email: keepTogether(email) })}</AuthText>
      <AuthActions>
        {failed ? <Banner tone="error" message={actionErrorMessage(confirm.error)} /> : null}
        <Button
          label={t('auth.verify.confirm')}
          onPress={() => void onConfirm()}
          loading={confirm.isPending}
        />
      </AuthActions>
    </>
  );
}

/** Подтверждено. Регистрировались на этом устройстве — ждём опрос и входим; иначе — текст про вход. */
function VerifiedLink({ email }: { email: string }) {
  // снимок на момент показа: после входа токен регистрации удаляется, а экран не должен «перескочить»
  const [registrationToken] = useState(() => {
    const { pending } = useRegistrationStore.getState();
    return pending && normalizeEmail(pending.email) === normalizeEmail(email)
      ? pending.registrationToken
      : undefined;
  });
  if (!registrationToken) return <VerifiedElsewhere email={email} />;
  return <SignInOnThisDevice registrationToken={registrationToken} email={email} />;
}

function SignInOnThisDevice({
  registrationToken,
  email,
}: {
  registrationToken: string;
  email: string;
}) {
  const poll = useRegistrationPoll(registrationToken);
  const signedIn = useSessionStore((state) => isSignedIn(state));
  useSignInWhenVerified(poll.data);

  if (signedIn) return <Redirect href="/" />;
  if (isRegistrationRejected(poll.error)) return <SignInRequired />;
  return (
    <>
      <VerifiedSigningIn email={email} />
      <PollProblem poll={poll} />
    </>
  );
}

function ExpiredLink({ token, email, onResult }: LinkStateProps) {
  const router = useRouter();
  const resend = useResendVerification();
  const [nextResendAt, setNextResendAt] = useState<number | undefined>();
  const [notice, setNotice] = useState<'sent' | 'tooMany' | null>(null);
  const secondsLeft = useSecondsLeft(nextResendAt);

  const onResend = async () => {
    setNotice(null);
    try {
      const result = await resend.mutateAsync({ linkToken: token });
      if ('state' in result) {
        onResult({ state: 'verified', email });
        return;
      }
      setNextResendAt(Date.now() + result.resendAvailableInSec * 1000);
      setNotice('sent');
      // устройство регистрации с ещё живым токеном: сервер продлевает только живой токен регистрации
      // (истёкший не воскрешается) — продлеваем локально ровно в этом случае
      const { pending } = useRegistrationStore.getState();
      if (
        pending &&
        pending.expiresAt > Date.now() &&
        normalizeEmail(pending.email) === normalizeEmail(email)
      ) {
        await useRegistrationStore.getState().resent(result.resendAvailableInSec);
      }
    } catch (error) {
      if (isGone(error)) onResult({ state: 'gone', email });
      const wait = retryAfterSec(error);
      if (wait === undefined) return;
      setNextResendAt(Date.now() + wait * 1000);
      setNotice('tooMany');
    }
  };

  const failed =
    resend.error !== null && retryAfterSec(resend.error) === undefined && !isGone(resend.error);

  return (
    <>
      <AuthTitle>{t('auth.expired.title')}</AuthTitle>
      <AuthText>{t('auth.expired.message', { email: keepTogether(email) })}</AuthText>
      <AuthActions>
        {notice === 'sent' ? (
          <Banner message={t('auth.expired.sent', { email: keepTogether(email) })} />
        ) : null}
        {notice === 'tooMany' ? (
          <Banner tone="warning" message={t('auth.checkEmail.tooMany')} />
        ) : null}
        {failed ? <Banner tone="error" message={actionErrorMessage(resend.error)} /> : null}
        <Button
          label={t('auth.expired.resend')}
          onPress={() => void onResend()}
          disabled={secondsLeft > 0}
          loading={resend.isPending}
        />
        {secondsLeft > 0 ? (
          <AuthMeta>
            {t('auth.checkEmail.cooldown', { time: formatCountdown(secondsLeft) })}
          </AuthMeta>
        ) : null}
        <TextAction label={t('auth.expired.toSignIn')} onPress={() => router.replace('/sign-in')} />
      </AuthActions>
    </>
  );
}

/** 404: аккаунт удалён (V-10) или ссылка не наша — к регистрации [ASSUMPTION, task.md §8.1]. */
function LinkGone() {
  const router = useRouter();
  return (
    <>
      <AuthTitle>{t('auth.gone.title')}</AuthTitle>
      <AuthText>{t('auth.gone.message')}</AuthText>
      <AuthActions>
        <Button label={t('auth.gone.toRegister')} onPress={() => router.replace('/register')} />
      </AuthActions>
    </>
  );
}
