---
paths:
  - "apps/api/**"
---

# Backend — apps/api (NestJS 12)

Процесс: скил `.claude/skills/backend-nest/SKILL.md`. Канон: `AGENTS.md` §4.

## Placement

- Модуль = ограниченный контекст: `src/modules/<context>/` (identity, profile, routes, rides, calendar,
  races, results, disputes, seasons, gamification, sharing, notifications, moderation, media).
- Внутри модуля: `*.controller.ts` (тонкий: валидация по контракту, вызов сервиса) →
  `*.service.ts` (бизнес-логика) → `*.repository.ts` (Drizzle) ; `jobs/*.processor.ts` (BullMQ);
  `index.ts` — публичный API модуля.
- Чужой модуль — только через его `index.ts`. Циклы модулей запрещены (без `forwardRef`).
- Общая инфраструктура (env, db, outbox, redis, queue, mail, http, ошибки) — `@rkarakulov/api-kit`; она не знает о
  модулях. В `src/` — только композиция: `config/env.ts` (`defineEnv`), `db/schema.ts`, `queues.ts`,
  `error-messages.ts`, `app.module.ts`/`worker.module.ts`. Нужно изменить инфраструктуру — задача в app-foundation.

## Правила

- DTO не пишутся руками: zod-схема из `@on-bike/contracts` → pipe валидации.
- Ошибки — доменные коды из contracts, без утечки стека и SQL наружу.
- Результаты, места, кластеры считает только сервер; входящие от клиента значения времени игнорируются.
- Споры, исключения треков, пересчёты, модерация — append-only таблицы; правка истории запрещена.
- Тяжёлая работа (разбор трека, геопересчёт, Skia/ffmpeg, OG, бейджи, уведомления, пересчёт сезона)
  — в `src/worker.ts` через BullMQ. HTTP-обработчик только ставит задачу.
- Задачи идемпотентны (ключ задачи = доменный id + версия), с ретраями и backoff; финальный провал —
  видимое состояние (dead-letter → действие в панели), а не тишина.
- Доменные события между модулями — через outbox-таблицу в той же транзакции.
- Конфиг — через типизированный config-модуль с zod-валидацией env при старте. `process.env` вне него — нельзя.
- Логи — структурные (pino), без персональных данных, биометрии (пульс, мощность, вес) и токенов.
- Время — UTC в БД, Europe/Minsk только на отображении.

## Проверка

`pnpm --filter @on-bike/api test`, затем `pnpm check`. Интеграционные тесты репозиториев — на
реальном PostgreSQL + PostGIS (Testcontainers или `pnpm infra:up`), не на моках.
