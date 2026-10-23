/** Нарушение уникальности PostgreSQL (23505); драйвер pg кладёт ошибку в `cause` DrizzleQueryError. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pgError = error instanceof Error && error.cause ? error.cause : error;
  if (typeof pgError !== 'object' || pgError === null) return false;
  const { code } = pgError as { code?: unknown };
  if (code !== '23505') return false;
  return (
    constraint === undefined || (pgError as { constraint?: unknown }).constraint === constraint
  );
}
