import { zodResolver } from '@hookform/resolvers/zod';
import { SignInRequest } from '@on-bike/contracts';
import { t } from '@on-bike/i18n';
import { Banner, Button, TextAction, TextField } from '@rkarakulov/ui';
import { useRouter } from 'expo-router';
import type { GenerateMetadataFunction } from 'expo-router/server';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { DocumentTitle } from '@/components/document-title';
import { AuthActions, AuthInline, AuthMeta, AuthScreen } from '@/features/auth/auth-screen';
import {
  fieldErrorMessage,
  retryAfterSec,
  serverFieldErrors,
  signInErrorMessage,
} from '@/features/auth/error-messages';
import { type SignInCredentials, useSignIn } from '@/features/auth/queries';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { formatCountdown, useSecondsLeft } from '@/lib/countdown';
import { publicPageMetadata } from '@/lib/page-metadata';

/** Схема формы — контракт без транспорта (его подмешивает клиент платформы). */
const SignInForm = SignInRequest.omit({ sessionTransport: true });
type SignInFormInput = z.input<typeof SignInForm>;

const FIELDS = ['email', 'password'] as const;

/** Момент через `sec` секунд (мс) — конец паузы 429. */
const momentIn = (sec: number) => Date.now() + sec * 1000;

/** Публичный экран (SSR web): мета и OG без данных формы. */
export const generateMetadata: GenerateMetadataFunction = () =>
  publicPageMetadata({
    title: t('auth.signIn.title'),
    description: t('app.tagline'),
    path: '/sign-in',
  });

/**
 * «Вход»: e-mail и пароль. Успех — сессия в сторе, гард переводит на вкладки; неподтверждённый e-mail — «Подтвердите
 * e-mail» с новым токеном регистрации. Ошибки — баннером: неверные данные (нейтрально), 429 с отсчётом, сеть.
 */
export default function SignInScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  // e-mail из регистрации, занятого адреса или подтверждённой ссылки — через память, не через URL
  const draftEmail = useRegistrationStore((state) => state.draft.email);
  const [lockedUntil, setLockedUntil] = useState<number | undefined>();
  const lockedSec = useSecondsLeft(lockedUntil);

  const {
    control,
    handleSubmit,
    getValues,
    setError,
    setValue,
    formState: { errors },
  } = useForm<SignInFormInput, unknown, SignInCredentials>({
    resolver: zodResolver(SignInForm),
    mode: 'onTouched',
    defaultValues: { email: draftEmail ?? '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await signIn.mutateAsync(values);
      if (result.state === 'verificationRequired') {
        await useRegistrationStore.getState().start(result);
        setValue('password', '');
        router.push('/check-email');
        return;
      }
      // вход уже в сторе (requestSignIn) — гард сам переключит стек на вкладки
      await useRegistrationStore.getState().clear();
    } catch (error) {
      const wait = retryAfterSec(error);
      if (wait !== undefined) setLockedUntil(momentIn(wait));
      for (const { field, code } of serverFieldErrors(error, FIELDS)) {
        setError(field, { type: 'server', message: code });
      }
    }
  });

  const toRegister = () => {
    const store = useRegistrationStore.getState();
    store.saveDraft({ ...store.draft, email: getValues('email') });
    // явно к регистрации: к уже смонтированной в стеке (форма возьмёт e-mail из черновика), иначе — замена этого
    // экрана; «назад» привёл бы на любой предыдущий экран (вход, «Подтвердите e-mail»)
    router.dismissTo('/register');
  };

  const failure = signIn.error;
  const locked = lockedSec > 0;
  const showFailure =
    failure !== null && retryAfterSec(failure) === undefined && !hasFieldErrors(failure);

  return (
    <AuthScreen title={t('auth.signIn.title')} lead={t('auth.signIn.lead')}>
      {/* заголовок вкладки после клиентской навигации (web); при SSR — из generateMetadata */}
      <DocumentTitle title={`${t('auth.signIn.title')} — ${t('app.name')}`} />
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
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.signIn.password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrorMessage(errors.password?.message)}
          />
        )}
      />
      <AuthActions>
        {locked ? (
          <Banner
            tone="warning"
            message={t('auth.signIn.locked', { time: formatCountdown(lockedSec) })}
          />
        ) : null}
        {showFailure ? <Banner tone="error" message={signInErrorMessage(failure)} /> : null}
        <Button
          label={t('auth.signIn.submit')}
          onPress={() => void onSubmit()}
          disabled={locked}
          loading={signIn.isPending}
        />
        <AuthInline>
          <AuthMeta>{t('auth.signIn.noAccount')}</AuthMeta>
          <TextAction label={t('auth.signIn.toRegister')} onPress={toRegister} />
        </AuthInline>
      </AuthActions>
    </AuthScreen>
  );
}

/** 400 по полям формы показываем у полей, не баннером. */
const hasFieldErrors = (error: unknown) => serverFieldErrors(error, FIELDS).length > 0;
