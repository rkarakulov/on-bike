import { zodResolver } from '@hookform/resolvers/zod';
import { ConfirmPasswordResetRequest, type PasswordResetLinkState } from '@pokatim/contracts';
import { size } from '@pokatim/design-tokens';
import { t } from '@pokatim/i18n';
import {
  AsyncContent,
  Banner,
  Button,
  keepTogether,
  Skeleton,
  SkeletonText,
  TextField,
} from '@rkarakulov/ui';
import { useLocalSearchParams } from 'expo-router';
import type { GenerateMetadataFunction } from 'expo-router/server';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { DocumentTitle } from '@/components/document-title';
import {
  AuthActions,
  AuthScreen,
  AuthStack,
  AuthText,
  AuthTitle,
} from '@/features/auth/auth-screen';
import {
  actionErrorMessage,
  apiErrorCode,
  fieldErrorMessage,
  serverFieldErrors,
} from '@/features/auth/error-messages';
import {
  PasswordChanged,
  ResetLinkExpired,
  ResetLinkGone,
  ResetLinkUsed,
} from '@/features/auth/password-reset-states';
import { useConfirmPasswordReset, usePasswordResetLink } from '@/features/auth/queries';
import { isSignedIn, useSessionStore } from '@/features/auth/session-store';
import { useSignOut } from '@/features/auth/use-sign-out';
import { publicPageMetadata } from '@/lib/page-metadata';

/**
 * Публичный экран (SSR web): нейтральный заголовок без e-mail и без `og:url` — в пути токен. `loader` нет:
 * адрес в HTML не попадает, состояние ссылки экран берёт из API после гидрации.
 */
export const generateMetadata: GenerateMetadataFunction = () =>
  publicPageMetadata({ title: t('auth.reset.title'), description: t('app.tagline') });

const DOCUMENT_TITLE = `${t('auth.reset.title')} — ${t('app.name')}`;

/** Код несовпадения повтора — только на клиенте: сервер получает один пароль (Q8). */
const MISMATCH = 'MISMATCH';

/** Схема формы — пароль из контракта + повтор с проверкой на клиенте. */
const ResetForm = ConfirmPasswordResetRequest.pick({ password: true })
  .extend({ passwordRepeat: z.string() })
  .refine((values) => values.password === values.passwordRepeat, {
    path: ['passwordRepeat'],
    message: MISMATCH,
  });
type ResetFormValues = z.infer<typeof ResetForm>;

const FIELDS = ['password'] as const;

type ResetView = { state: PasswordResetLinkState | 'gone' | 'changed'; email: string };

const isGone = (error: unknown) => apiErrorCode(error) === 'NOT_FOUND';

/**
 * Ссылка из письма `…/auth/reset/<token>`. Открытие только читает состояние (GET); пароль меняется кнопкой
 * «Сохранить пароль» (POST). Сессию сброс не выдаёт: дальше — «Вход» с новым паролем (Q2).
 */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  // результат действий на экране важнее ответа GET
  const [override, setOverride] = useState<ResetView | null>(null);
  // после смены пароля ссылка больше не читается: выход очищает кеш запросов, повторный GET не нужен
  const link = usePasswordResetLink(token, override?.state !== 'changed');

  // успех — вне AsyncContent: не зависит от состояния запроса ссылки (скелетон, сбой GET)
  if (override?.state === 'changed') {
    return (
      <AuthScreen kicker={t('auth.forgot.kicker')}>
        <DocumentTitle title={DOCUMENT_TITLE} />
        <PasswordChanged email={override.email} />
      </AuthScreen>
    );
  }

  if (override?.state === 'gone' || isGone(link.error)) {
    return (
      <AuthScreen kicker={t('auth.forgot.kicker')}>
        <DocumentTitle title={DOCUMENT_TITLE} />
        <ResetLinkGone />
      </AuthScreen>
    );
  }

  // 410 на сохранении: точное состояние (использована / заменена / истекла) — повторным GET
  const reread = () => {
    setOverride(null);
    void link.refetch();
  };

  // шапка сценария видна сразу; заголовок зависит от состояния ссылки — до ответа на его месте скелетон
  return (
    <AuthScreen kicker={t('auth.forgot.kicker')}>
      <DocumentTitle title={DOCUMENT_TITLE} />
      <AsyncContent query={link} skeleton={<LinkSkeleton />}>
        {(info) => {
          const view = override ?? info;
          switch (view.state) {
            case 'valid':
              return (
                <NewPasswordForm
                  token={token}
                  email={view.email}
                  onChanged={(email) => setOverride({ state: 'changed', email })}
                  onGone={() => setOverride({ state: 'gone', email: view.email })}
                  onStale={reread}
                />
              );
            case 'used':
              return <ResetLinkUsed email={view.email} />;
            default:
              return <ResetLinkExpired email={view.email} />;
          }
        }}
      </AsyncContent>
    </AuthScreen>
  );
}

function LinkSkeleton() {
  return (
    <AuthStack>
      <SkeletonText variant="displayTitle" lastLineWidth="60%" />
      <SkeletonText />
      <Skeleton height={size.buttonHeight} />
      <Skeleton height={size.buttonHeight} />
      <Skeleton height={size.buttonHeight} />
    </AuthStack>
  );
}

interface NewPasswordFormProps {
  token: string;
  email: string;
  onChanged: (email: string) => void;
  onGone: () => void;
  onStale: () => void;
}

function NewPasswordForm({ token, email, onChanged, onGone, onStale }: NewPasswordFormProps) {
  const confirm = useConfirmPasswordReset();
  const signOut = useSignOut();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(ResetForm),
    mode: 'onTouched',
    defaultValues: { password: '', passwordRepeat: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      const result = await confirm.mutateAsync({ token, password });
      const hadSession = isSignedIn(useSessionStore.getState());
      // успех показываем сразу; сервер отозвал все сессии аккаунта — сессия этого устройства выходит локально (Q9)
      onChanged(result.email);
      if (hadSession) await signOut();
    } catch (error) {
      const code = apiErrorCode(error);
      if (code === 'NOT_FOUND') onGone();
      if (code === 'LINK_EXPIRED') onStale();
      for (const { field, code: fieldCode } of serverFieldErrors(error, FIELDS)) {
        setError(field, { type: 'server', message: fieldCode });
      }
    }
  });

  const failureCode = apiErrorCode(confirm.error);
  const failed =
    confirm.error !== null &&
    failureCode !== 'LINK_EXPIRED' &&
    failureCode !== 'NOT_FOUND' &&
    failureCode !== 'VALIDATION_FAILED';
  const repeatCode = errors.passwordRepeat?.message;

  return (
    <>
      <AuthTitle>{t('auth.reset.title')}</AuthTitle>
      <AuthText>{t('auth.reset.message', { email: keepTogether(email) })}</AuthText>
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.reset.password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrorMessage(errors.password?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="passwordRepeat"
        render={({ field }) => (
          <TextField
            label={t('auth.reset.passwordRepeat')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            error={
              repeatCode === MISMATCH ? t('auth.reset.mismatch') : fieldErrorMessage(repeatCode)
            }
          />
        )}
      />
      <AuthActions>
        {failed ? <Banner tone="error" message={actionErrorMessage(confirm.error)} /> : null}
        <Button
          label={t('auth.reset.submit')}
          onPress={() => void onSubmit()}
          loading={confirm.isPending}
        />
      </AuthActions>
    </>
  );
}
