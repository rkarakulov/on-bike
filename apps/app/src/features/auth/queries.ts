import type {
  RegisterRequest,
  RegistrationPollResponse,
  ResendVerificationRequest,
} from '@on-bike/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

import { apiErrorCode } from './error-messages';

/** Интервал опроса подтверждения на экране «Подтвердите e-mail». */
export const POLL_INTERVAL_MS = 3000;

export const authKeys = {
  verificationLink: (token: string) => ['auth', 'verification-link', token] as const,
  registrationPoll: (registrationToken: string) =>
    ['auth', 'registration-poll', registrationToken] as const,
};

/** 401 по токену регистрации: токен истёк или уже обменян на сессию — дальше только вход по паролю. */
export const isRegistrationRejected = (error: unknown) => apiErrorCode(error) === 'UNAUTHORIZED';

export function useRegister() {
  return useMutation({ mutationFn: (body: RegisterRequest) => api.register(body) });
}

/** Чтение ссылки из письма — без побочных эффектов на сервере (C2). */
export function useVerificationLink(token: string) {
  return useQuery({
    queryKey: authKeys.verificationLink(token),
    queryFn: () => api.getVerificationLink(token),
  });
}

export function useConfirmVerification() {
  return useMutation({ mutationFn: (token: string) => api.confirmVerification({ token }) });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (body: ResendVerificationRequest) => api.resendVerification(body),
  });
}

/**
 * Опрос подтверждения по токену регистрации. Ответ `verified` с сессией приходит ровно один раз,
 * поэтому он не перезапрашивается (staleTime ∞), а 401 не повторяется.
 */
export function useRegistrationPoll(registrationToken: string | undefined) {
  return useQuery<RegistrationPollResponse>({
    queryKey: authKeys.registrationPoll(registrationToken ?? ''),
    queryFn: () => api.pollRegistration({ registrationToken: registrationToken ?? '' }),
    enabled: registrationToken !== undefined,
    staleTime: Infinity,
    refetchInterval: (query) =>
      query.state.data?.state === 'verified' || isRegistrationRejected(query.state.error)
        ? false
        : POLL_INTERVAL_MS,
    retry: (failureCount, error) => !isRegistrationRejected(error) && failureCount < 2,
  });
}
