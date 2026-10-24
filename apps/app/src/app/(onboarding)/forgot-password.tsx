import { zodResolver } from '@hookform/resolvers/zod';
import { RequestPasswordResetRequest } from '@on-bike/contracts';
import { t } from '@on-bike/i18n';
import { Banner, Button, keepTogether, TextAction, TextField } from '@rkarakulov/ui';
import { useRouter } from 'expo-router';
import type { GenerateMetadataFunction } from 'expo-router/server';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { DocumentTitle } from '@/components/document-title';
import { AuthActions, AuthMeta, AuthScreen, AuthText } from '@/features/auth/auth-screen';
import {
  actionErrorMessage,
  fieldErrorMessage,
  retryAfterSec,
  serverFieldErrors,
} from '@/features/auth/error-messages';
import { useRequestPasswordReset } from '@/features/auth/queries';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { formatCountdown, useSecondsLeft } from '@/lib/countdown';
import { publicPageMetadata } from '@/lib/page-metadata';

type ForgotFormInput = z.input<typeof RequestPasswordResetRequest>;
type ForgotFormOutput = z.output<typeof RequestPasswordResetRequest>;

const FIELDS = ['email'] as const;
const DOCUMENT_TITLE = `${t('auth.forgot.title')} — ${t('app.name')}`;

/** Публичный экран (SSR web): мета и OG без данных формы. */
export const generateMetadata: GenerateMetadataFunction = () =>
  publicPageMetadata({
    title: t('auth.forgot.title'),
    description: t('app.tagline'),
    path: '/forgot-password',
  });

/** Момент через `sec` секунд (мс) — конец паузы повтора. */
const momentIn = (sec: number) => Date.now() + sec * 1000;

/**
 * «Восстановление пароля»: e-mail → ссылка в письме. Ответ сервера один для любого адреса, поэтому «Проверьте почту»
 * говорит нейтрально («если аккаунт есть»). Повтор — после паузы (`resendAvailableInSec` / 429 `retryAfterSec`).
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const request = useRequestPasswordReset();
  // e-mail из формы входа — через память (черновик), не через URL
  const draftEmail = useRegistrationStore((state) => state.draft.email);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [nextAt, setNextAt] = useState<number | undefined>();
  const [tooMany, setTooMany] = useState(false);
  const secondsLeft = useSecondsLeft(nextAt);

  const {
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<ForgotFormInput, unknown, ForgotFormOutput>({
    resolver: zodResolver(RequestPasswordResetRequest),
    mode: 'onTouched',
    defaultValues: { email: draftEmail ?? '' },
  });

  const send = async (email: string) => {
    setTooMany(false);
    try {
      const result = await request.mutateAsync({ email });
      setSentTo(email);
      setNextAt(momentIn(result.resendAvailableInSec));
    } catch (error) {
      const wait = retryAfterSec(error);
      if (wait !== undefined) {
        setNextAt(momentIn(wait));
        setTooMany(true);
      }
      for (const { field, code } of serverFieldErrors(error, FIELDS)) {
        setError(field, { type: 'server', message: code });
      }
    }
  };

  const onSubmit = handleSubmit((values) => send(values.email));

  const toSignIn = () => {
    const store = useRegistrationStore.getState();
    store.saveDraft({ ...store.draft, email: sentTo ?? getValues('email') });
    // к уже смонтированному «Входу» (форма возьмёт e-mail из черновика), иначе — замена этого экрана
    router.dismissTo('/sign-in');
  };

  const failure = request.error;
  const showFailure =
    failure !== null &&
    retryAfterSec(failure) === undefined &&
    serverFieldErrors(failure, FIELDS).length === 0;
  const waiting = secondsLeft > 0;

  const actions = (
    <>
      {tooMany ? <Banner tone="warning" message={t('auth.checkEmail.tooMany')} /> : null}
      {showFailure ? <Banner tone="error" message={actionErrorMessage(failure)} /> : null}
    </>
  );
  const cooldown = waiting ? (
    <AuthMeta>{t('auth.checkEmail.cooldown', { time: formatCountdown(secondsLeft) })}</AuthMeta>
  ) : null;
  const back = <TextAction label={t('auth.expired.toSignIn')} onPress={toSignIn} />;

  if (sentTo !== null) {
    return (
      <AuthScreen kicker={t('auth.forgot.kicker')} title={t('auth.forgot.sentTitle')}>
        <DocumentTitle title={DOCUMENT_TITLE} />
        <AuthText>{t('auth.forgot.sentMessage', { email: keepTogether(sentTo) })}</AuthText>
        <AuthActions>
          {actions}
          <Button
            variant="secondary"
            label={t('auth.forgot.resend')}
            onPress={() => void send(sentTo)}
            disabled={waiting}
            loading={request.isPending}
          />
          {cooldown}
          {back}
        </AuthActions>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      kicker={t('auth.forgot.kicker')}
      title={t('auth.forgot.title')}
      lead={t('auth.forgot.lead')}
    >
      {/* заголовок вкладки после клиентской навигации (web); при SSR — из generateMetadata */}
      <DocumentTitle title={DOCUMENT_TITLE} />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label={t('auth.signIn.email')}
            placeholder={t('auth.register.emailPlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrorMessage(errors.email?.message)}
          />
        )}
      />
      <AuthActions>
        {actions}
        <Button
          label={t('auth.forgot.submit')}
          onPress={() => void onSubmit()}
          disabled={waiting}
          loading={request.isPending}
        />
        {cooldown}
        {back}
      </AuthActions>
    </AuthScreen>
  );
}
