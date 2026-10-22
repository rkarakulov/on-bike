# Локальная разработка

Когда применять: первый запуск на новой машине, после `pnpm install`, когда API не стартует из-за env.

## Шаги

1. Инфраструктура: `pnpm infra:up` — PostgreSQL 18 + PostGIS (`:5432`), Redis (`:6379`),
   Mailpit (SMTP `:1025`, веб `http://127.0.0.1:8025`).
2. Окружение API: `cp apps/api/.env.example apps/api/.env` и заполнить секреты:
   `JWT_SECRET` и `EMAIL_TOKEN_SECRET` — случайные строки не короче 32 символов
   (`openssl rand -hex 32`). Файл `.env` в git не попадает.
3. Миграции (отдельный шаг, при старте API не выполняются): `pnpm --filter @on-bike/api db:migrate`.
4. Запуск: `pnpm dev --filter=@on-bike/api` (HTTP `:3000`) и `pnpm dev:worker` (outbox → BullMQ,
   письма, очистка по расписанию). Без worker письма не уходят — события копятся в `outbox`.

## Переменные API

| Переменная | Dev-значение | Назначение |
|---|---|---|
| `DATABASE_URL` | `postgres://onbike:onbike@127.0.0.1:5432/onbike` | основная БД |
| `REDIS_URL` | `redis://127.0.0.1:6379` | BullMQ, rate-limit |
| `TRUST_PROXY` | `0` | `1` за Caddy: доверять одному прокси в `X-Forwarded-For` |
| `JWT_SECRET` | случайная строка ≥ 32 | подпись access JWT |
| `EMAIL_TOKEN_SECRET` | случайная строка ≥ 32 | HMAC токенов ссылок в письмах (ADR-0002) |
| `SMTP_URL` | `smtp://127.0.0.1:1025` | Mailpit |
| `MAIL_FROM` | `on-bike <no-reply@on-bike.by>` | отправитель писем |
| `APP_LINK_BASE` | `exp://127.0.0.1:8081/--/` | база ссылок в письмах, со слешем в конце |
| `AGREEMENT_VERSION` | `2026-10-draft` | версия соглашения, записывается в `user_consents` |

`127.0.0.1`, а не `localhost`: на macOS `localhost` может уйти в IPv6, где контейнеры не слушают.

## Ссылки из писем и Expo Go

Expo Go не открывает схему `onbike://`. Для проверки на телефоне через Expo Go:

- `APP_LINK_BASE=exp://<LAN-IP компьютера>:8081/--/` (тот же адрес, что показывает `expo start`);
  на симуляторе — `exp://127.0.0.1:8081/--/`;
- в нативных dev/preview-сборках до появления домена — `APP_LINK_BASE=onbike://`;
- в проде — https-база приложения (ADR-0003 §5): ссылка открывается в браузере/PWA или в установленном приложении.

После смены `APP_LINK_BASE` перезапустите worker: ссылка собирается при отправке письма.

## Проверка

- `curl http://127.0.0.1:3000/v1/health` → `{"status":"ok",…}`.
- Регистрация: `POST /v1/auth/register` → письмо в Mailpit (`http://127.0.0.1:8025`,
  API: `GET http://127.0.0.1:8025/api/v1/messages`) со ссылкой `…auth/verify/<token>`.

## Тесты

`pnpm test` поднимает интеграционные тесты API на реальных PostgreSQL и Redis:

- `DATABASE_URL_TEST` (по умолчанию `postgres://onbike:onbike@127.0.0.1:5432/onbike_test`) —
  база **пересоздаётся** перед прогоном и мигрируется; имя обязано оканчиваться на `_test`;
- `REDIS_URL_TEST` (по умолчанию `redis://127.0.0.1:6379/1`) — db 1, очищается перед каждым тестом.

Только unit: `pnpm --filter @on-bike/api exec vitest run --project unit`.

## Откат

Сбросить локальные данные: `pnpm infra:down`, удалить тома docker (`pgdata`, `redisdata`) вручную,
затем шаги 1–3.
