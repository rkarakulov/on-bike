import { z } from 'zod';

export const MIN_AGE_YEARS = 18;

/** Возраст в полных годах на дату `now` (UTC). */
export function ageInYears(birthDate: Date, now: Date = new Date()): number {
  const years = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const hadBirthday =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
  return hadBirthday ? years : years - 1;
}

export const RegisterRequest = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  birthDate: z.iso
    .date()
    .refine((value) => ageInYears(new Date(value)) >= MIN_AGE_YEARS, { message: 'AGE_BELOW_18' }),
  personalDataConsent: z.literal(true),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;
