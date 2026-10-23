# Локальная разработка

Когда применять: первый запуск на новой машине, после `pnpm install`, когда API не стартует из-за env.

## Шаги

0. Доступ к пакетам базы `@rkarakulov/*` (GitHub Packages, ADR-0004), один раз на машине:
   `gh auth refresh -s read:packages` и в пользовательский `~/.npmrc` строку
   `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` (pnpm раскрывает переменные только там, не в
   проектном `.npmrc`). Перед `pnpm install` — `export NODE_AUTH_TOKEN=$(gh auth token)`.
   Сам токен нигде не записывается.
1. Инфраструктура: `pnpm infra:up` — PostgreSQL 18 + PostGIS (`:5432`), Redis (`:6379`),
   Mailpit (SMTP `:1025`, веб `http://127.0.0.1:8025`).
2. Окружение API: `cp apps/api/.env.example apps/api/.env` и заполнить секреты:
   `JWT_SECRET` и `EMAIL_TOKEN_SECRET` — случайные строки не короче 32 символов
   (`openssl rand -hex 32`). Файл `.env` в git не попадает.
3. Миграции (отдельный шаг, при старте API не выполняются): `pnpm --filter @on-bike/api db:migrate`.
4. Запуск: `pnpm dev --filter=@on-bike/api` (HTTP `:3000`) и `pnpm dev:worker` (outbox → BullMQ, письма).
   Без worker письма не уходят — события копятся в `outbox`.
5. Приложение: `pnpm --filter @on-bike/app dev` (QR → Expo Go, `i` / `a` — симуляторы).
   Админка: `pnpm dev --filter=@on-bike/admin` (`http://127.0.0.1:5173`, `/v1` проксируется на API).
   Лендинг (до F5): `pnpm dev --filter=@on-bike/landing` (`http://127.0.0.1:4321`).

## Переменные API

| Переменная | Dev-значение | Назначение |
|---|---|---|
| `DATABASE_URL` | `postgres://on_bike:on_bike@127.0.0.1:5432/on_bike` | основная БД |
| `REDIS_URL` | `redis://127.0.0.1:6379` | BullMQ, rate-limit |
| `TRUST_PROXY` | `0` | `1` за обратным прокси: доверять одному прокси в `X-Forwarded-For` |
| `SMTP_URL` | `smtp://127.0.0.1:1025` | Mailpit |
| `JWT_SECRET` | случайная строка ≥ 32 | подпись access JWT |
| `EMAIL_TOKEN_SECRET` | случайная строка ≥ 32 | HMAC токенов ссылок в письмах (ADR-0002) |
| `MAIL_FROM` | `'on-bike <no-reply@on-bike.by>'` | отправитель писем (в кавычках) |
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
- Письма — в Mailpit: `http://127.0.0.1:8025` (API: `GET http://127.0.0.1:8025/api/v1/messages`).
- Регистрация: `POST /v1/auth/register` → письмо в Mailpit со ссылкой `…auth/verify/<token>`.

## Тесты

`pnpm test` поднимает интеграционные тесты API на реальных PostgreSQL и Redis:

- `DATABASE_URL_TEST` (по умолчанию `postgres://on_bike:on_bike@127.0.0.1:5432/on_bike_test`) —
  база **пересоздаётся** перед прогоном и мигрируется; имя обязано оканчиваться на `_test`;
- `REDIS_URL_TEST` (по умолчанию `redis://127.0.0.1:6379/1`) — db 1, очищается перед каждым тестом.

Только unit: `pnpm --filter @on-bike/api exec vitest run --project unit`.

## CI и сборки

- **GitHub Actions** читает `@rkarakulov/*` токеном `GITHUB_TOKEN` только после того, как владелец пакетов
  откроет доступ репозиторию проекта: в настройках **каждого** из 8 пакетов (`config`, `design-tokens`, `ui`,
  `i18n-core`, `contracts-core`, `api-client-core`, `api-kit`, `test-kit`) → Manage Actions access → репозиторий
  проекта, роль Read. Без этого `pnpm install` в CI падает с 403.
- **EAS Build** (облачная сборка) не видит ваш `~/.npmrc`: перед первой сборкой создайте в EAS секрет
  `NODE_AUTH_TOKEN` (токен с `read:packages`, видимость — secret) и хук `eas-build-pre-install` в
  `apps/app/package.json`, который дописывает строку авторизации в `~/.npmrc` сборщика — тот же вид, что
  локально. До этого EAS-сборка упадёт на установке `@rkarakulov/*` (шаблон хук пока не поставляет).

## Обновление шаблона

`uvx copier update --defaults` в чистом рабочем дереве: переносит изменения шаблона app-foundation
трёхсторонним слиянием и поднимает версию `@rkarakulov/*` в каталоге `pnpm-workspace.yaml`. Конфликты — маркеры
в файлах и `*.rej`; разрешить, удалить `*.rej`, затем `pnpm install && pnpm check`. Проверить наличие новой
версии — `uvx copier check-update`.

## Переход существующего тома на БД `on_bike` (F3b)

С F3b dev-БД, CI и тесты используют имя шаблона `on_bike` (было `onbike`). Том `pgdata`, созданный раньше,
не пересоздаётся: роль и база добавляются в него, старая база `onbike` остаётся как есть.

```bash
docker compose -f infra/docker-compose.dev.yml exec postgres psql -U onbike -d onbike \
  -c "CREATE ROLE on_bike LOGIN SUPERUSER PASSWORD 'on_bike';" -c "CREATE DATABASE on_bike OWNER on_bike;"
DATABASE_URL=postgres://on_bike:on_bike@127.0.0.1:5432/on_bike pnpm --filter @on-bike/api db:migrate
```

Потом в своём `apps/api/.env` — тот же `DATABASE_URL` и `MAIL_FROM` в кавычках (как в `.env.example`).
Порядок важен: без явного `DATABASE_URL` миграции уйдут в старую базу `onbike`, а `on_bike` останется пустой. Тестовая база `on_bike_test` создаётся сама при `pnpm test`.

## Откат

Сбросить локальные данные: `pnpm infra:down`, удалить тома docker (`pgdata`, `redisdata`) вручную,
затем шаги 1–3.
