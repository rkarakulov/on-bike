# Findings — app-foundation F1 + F2

Ревьюер: Claude `independent-reviewer`. Репозиторий: `~/PROJECTS/app-foundation`.

## Pass 1 — 24958dc..6958fb2 — REQUEST CHANGES

| # | Severity | Находка | Статус |
|---|---|---|---|
| 1 | HIGH | Пакеты из `dist` (ESM) не грузятся в jest-expo у потребителя; опубликованный вид не проверяется в CI | fixed (9316c32): `transformIgnorePatterns` в README, `pnpm smoke` (pack → tsc, Node, jest-expo) в CI и релизе |
| 2 | MEDIUM | `createApiHarness.reset()` делает `FLUSHDB` по любому `REDIS_URL` | fixed: `testRedisDb` — БД ≥ 1 |
| 3 | MEDIUM | Релиз без проверок; actions с правами записи по тегам | fixed: check/build/smoke до публикации, SHA, права на уровне job |
| 4 | MEDIUM | Дубликаты пакетов ломают `instanceof` и Symbol-токены | fixed: `Symbol.for`-метки, api-kit — peer test-kit, zod — peer, `workspace:^` |
| 5–12 | LOW | MailModule без проверки env; d.ts contracts-core (TS2536); peer `*`; мёртвое правило ESLint `color`; `{count}` без Intl; `color-scheme` по имени темы; CI permissions; соглашение плагина в базе; остатки домена | fixed (9316c32) |

## Pass 2 — 6958fb2..9316c32 — APPROVE

Все находки pass 1 закрыты, регрессий нет. Новые LOW (исправлены в 70e4c75): тесты релиза шли с токеном
записи (вынесены в job `verify` без прав), `ui` не объявлял peer `zod`, JSDoc `DomainError`, комментарий smoke.

NOT VERIFIED: реальный запуск workflow в GitHub Actions (publish, `.npmrc` от setup-node); сборка Metro/Expo
с `@rkarakulov/ui` из `dist` на устройстве и в вебе — проверяется в F4 (перевод on-bike).
