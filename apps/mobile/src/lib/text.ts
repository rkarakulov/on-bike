/**
 * Адрес e-mail как неразрывное слово: word joiner (U+2060) между символами не даёт переносу
 * разорвать адрес посередине (`rider.e2e` / `.1@example.by`); целиком адрес переносится на новую строку.
 */
export function keepTogether(value: string): string {
  return Array.from(value).join('\u2060');
}
