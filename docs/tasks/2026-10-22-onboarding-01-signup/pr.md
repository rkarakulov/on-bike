# Онбординг · слайс 1: регистрация и подтверждение e-mail

## Summary
Райдер создаёт аккаунт по e-mail (18+, согласие на обработку данных, соглашение кнопкой), подтверждает адрес
кнопкой по ссылке из письма и входит без повторного ввода пароля (V-09). Бэкенд identity (NestJS + Drizzle +
BullMQ + outbox + SMTP), контракты и api-client, мобильные экраны по прототипу `key-onboarding`.
Плюс решения по платформе: ADR-0003 (одно универсальное приложение iOS/Android/web/PWA) и AGENTS.md §4.13.

## Motivation
Первый слайс онбординга (5 слайсов, решение человека). Spec: `docs/tasks/2026-10-22-onboarding-01-signup/task.md`.
Решения человека: Q1 токен регистрации (ADR-0002), Q2 Mailpit + SMTP, Q3 база ссылок в конфиге, Q4 значения прототипа.

## Changes
- **api / identity:** `POST /v1/auth/register`, `GET /v1/auth/verification/:token` (без побочных эффектов),
  `POST …/verification/confirm` (идемпотентно), `POST …/verification/resend` (60 с, 10/сутки), `POST …/registration/poll`
  (одноразовый обмен на сессию: access JWT 15 мин + refresh 30 дней хешем); письмо — outbox → `identity-email` →
  захват отправки → SMTP; очистка неподтверждённых через 7 дней (03:00 Минск, батчи).
- **api / infra:** `http-app.ts`, `ApiExceptionFilter`, `DomainError`, clock, redis rate-limiter (Lua), mail (nodemailer,
  таймауты), outbox writer/reader/publisher (SKIP LOCKED, jobId = id события).
- **contracts:** `src/auth/*.schema.ts`, коды ошибок и полей, `normalizeEmail`, возраст по Europe/Minsk.
- **api-client:** 5 методов, толерантный разбор ошибок (`UNKNOWN`). **i18n:** `t(key, params)`.
- **mobile:** `(onboarding)/{register,check-email,sign-in}`, `auth/verify/[token]`, гард `Stack.Protected`, SecureStore +
  zustand, QueryClient + NetInfo; дизайн-система: `DateField`, `Button loading`, `TextField helper`, `field-frame`.
- **docs:** ADR-0002, ADR-0003 (+ ADR-0001 помечен), runbook local-dev, architecture, задача-основа universal-app,
  AGENTS.md §4.13, контракт ревью и чек-лист ревьюера (§4.13).

## Testing
- `pnpm check` — PASS (14/14). api 74 (unit + интеграционные на реальных PostgreSQL/PostGIS и Redis, включая гонки:
  параллельная регистрация, 5 параллельных poll → 1 сессия, confirm vs очистка на двух соединениях, параллельная
  доставка письма, упавший worker, подмена X-Forwarded-For); mobile 130; contracts 19; api-client 10; i18n 2.
- Вручную на Android (Expo Go): полный путь acceptance 7 — OK (см. task.md §12). API-смоук через curl + Mailpit — OK.
- NOT VERIFIED: iOS, тёмная тема экранов, скринридеры, web (по ADR-0003 — следующая задача).

## Migrations / Env / Config
- Миграции: `0002_identity` (новые таблицы, индекс outbox), `0003_verification_send_claim` (`ADD COLUMN`) — expand-only;
  применяются отдельным шагом (`db:migrate`).
- Env API (новые): `JWT_SECRET`, `EMAIL_TOKEN_SECRET` (≥ 32), `SMTP_URL`, `MAIL_FROM`, `APP_LINK_BASE`
  (Expo Go: `exp://<host>:8081/--/`), `TRUST_PROXY` (число хопов; за Caddy — 1), `AGREEMENT_VERSION`.
  Env mobile: `EXPO_PUBLIC_API_URL`. `infra/.env.example` обновлён.
- `infra/docker-compose.dev.yml`: Mailpit (:1025 SMTP, :8025 UI). CI: сервисы PostgreSQL/PostGIS + Redis, `turbo.json` test.env.
- Зависимости: api — `@node-rs/argon2`, `jose`, `nodemailer` 10.1.7; mobile — `expo-secure-store`, NetInfo, datetimepicker,
  `react-hook-form`, `@hookform/resolvers`, `zustand` 5.0.15 (версии старше суток — политика pnpm).

## Risks
- Письмо: доставка at-least-once (SMTP принял, worker упал до `sent_at` → дубль с той же ссылкой через 60 с).
- `EMAIL_TAKEN` / `EMAIL_UNAVAILABLE` раскрывают существование адреса — принято прототипом, смягчено лимитом по IP.
- Web-варианты (`DateField`, хранилище, cookie-сессия) — задача-основа сразу после этого PR (AGENTS.md §4.13 «Переход»).

## Follow-ups
- Отдельный секрет для HMAC ключа лимита по IP (сейчас — `EMAIL_TOKEN_SECRET` с разделением доменов).
- Слайсы 2–5 онбординга; задача-основа universal-app (до слайса 2).

## Acceptance checklist
- [x] 1. Регистрация → 201, аккаунт не активен, письмо в Mailpit. — тесты + ручная проверка
- [x] 2. < 18 / без согласия / короткий пароль → 400 по полям; `EMAIL_TAKEN`, `EMAIL_UNAVAILABLE`. — тесты
- [x] 3. GET без изменений; confirm идемпотентен; 410 `LINK_EXPIRED` + e-mail. — тесты + БД вручную
- [x] 4. Повтор: 60 с / 10 в сутки → 429 + `retryAfterSec`; новая ссылка отменяет прежние. — тесты
- [x] 5. Poll: pending → verified + сессия один раз; повтор 401. — тесты + curl
- [x] 6. Очистка 7 дней (и не трогает подтверждённых при гонке). — тесты
- [x] 7. Сквозной путь на телефоне без пароля; DS и состояния §4.11–§4.12. — Android, тесты
- [x] 8. Интеграционные тесты на реальных PG/Redis; `pnpm check` — зелёный (CI — после push).

## Review summary
- Codex: pass 1 (CRITICAL 2, HIGH 3), pass 2 (HIGH 1, MEDIUM 1), pass 3 **APPROVE**.
- Claude: pass 1 (HIGH 1, MEDIUM 2, LOW 7), pass 2 **APPROVE** (MEDIUM 1, LOW 4 — исправлены, кроме общего секрета IP).
- Открытых CRITICAL/HIGH нет. Подробно: `findings.md`.
