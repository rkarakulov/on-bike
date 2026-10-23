# Архитектура on-bike

Текущее состояние системы. Решения и их обоснование — в [`../adr/`](../adr/README.md).

## Контейнеры

```
mobile (Expo) ─┐
admin (Vite)  ─┼─ HTTPS ─ Caddy ─ api (NestJS) ─┬─ PostgreSQL 18 + PostGIS
landing (Astro)┘                                ├─ Redis (BullMQ, rate-limit)
                                                └─ S3 (треки, фото, карточки, бэкапы)
                         worker (NestJS, BullMQ) ─ те же PG / Redis / S3; ffmpeg, Skia
```

Одна VPS, Docker Compose (`infra/`). Kubernetes, CDN, поиск, push, WebSocket — вне MVP.

## Модули API (`apps/api/src/modules/`)

identity · profile · routes · rides · calendar · races · results · disputes · seasons ·
gamification · sharing · notifications · moderation · media

Межмодульные вызовы — через `index.ts` модуля; события — outbox → BullMQ.

## Ключевые потоки

- **Заезд:** файл (resumable upload) → S3 → задача разбора трека → проверка коридора (PostGIS) →
  результат, кластер, флаги правдоподобия → пересчёт мест → уведомление in-app.
- **Протокол:** чек-лист публикации → публикация → финальные результаты → пересчёт сезона.
- **Спор:** подача → ответы обвиняемого (append-only) → решение → DQ / отклонение → пересчёт.
- **Шеринг:** запрос карточки → задача рендера (Skia / ffmpeg) → S3 → публичная ссылка → landing + OG.

### Регистрация и подтверждение e-mail (модуль `identity`, ADR-0002)

```
mobile ─ POST /v1/auth/register ─► api: users + user_consents + ссылка + registration_token + outbox
                                          (одна транзакция; Redis: пауза повтора 60 с, лимит по IP)
worker: outbox-публикатор ─► очередь identity-email ─► захват отправки (send_claimed_at, 60 с)
        ─► SMTP (dev — Mailpit) ─► sent_at; доставка at-least-once, дубль — с той же ссылкой
ссылка …auth/verify/<token> ─ GET (только чтение) ─ POST confirm ─► email_verified_at
mobile ─ POST /v1/auth/registration/poll ─► pending | verified + сессия (обмен один раз)
worker: identity-maintenance, 03:00 Europe/Minsk ─► удаление неподтверждённых старше 7 дней
```

- Токен ссылки — HMAC от id строки (`EMAIL_TOKEN_SECRET`), в БД только sha256; ретрай письма — та же ссылка.
- Повтор письма (`resend`): пауза 60 с и ≤ 10 за сутки (Redis, атомарно через Lua); новая ссылка
  отменяет прежние и продлевает токен регистрации.
- Мутации аккаунта сериализуются `SELECT … FROM users … FOR UPDATE`; сроки сравниваются с `CLOCK`
  приложения, а не с `now()` в SQL.
- Ошибки — единый `ApiError` из contracts (глобальный фильтр), в ответах и логах нет SQL, стеков,
  e-mail и токенов.

## Outbox и очереди

- Модуль пишет событие через `OutboxWriter.append(tx, …)` в той же транзакции, что и данные; в payload —
  только id.
- Публикатор (`OutboxPublisherModule` из `@rkarakulov/api-kit`, только worker) раз в ~1 с берёт пачку `FOR UPDATE SKIP LOCKED`,
  ставит задачу `queue.add(type, { outboxEventId }, { jobId: id })` и отмечает `published_at`.
  Маршруты тип → очередь задаёт composition root (`worker.module.ts`); инфраструктура базы о модулях не знает.
- Задачи идемпотентны: повторная публикация не дублирует задачу (тот же `jobId`), обработчик
  перечитывает состояние из БД. Очистка опубликованных событий outbox — отдельная задача (позже).

## Дизайн-система (`packages/design-tokens`)

Источник — CSS прототипов (19 экранов, визуальный слой «Ателье»).

- **Бренд** (`brand.ts`, единственное место палитры): палитра прототипов (внутри файла, не экспортируется),
  шрифты (Playfair Display + Inter) и роли `text.*`, `surface.*`, `border.*`, `action.*`, `status.*`,
  `map.*`, `surfaceBar.*`, `control.*`, `surface.skeleton` для тем `light` (Jersey Aura), `dark` (Night Ride),
  `panel` (веб-панель «Протокол»: светлая семантика + `nav.*` тёмной навигации).
- **Структурные токены** — из базы `@rkarakulov/design-tokens`: `space`, `inset`, `size`, `stroke`, `radius`
  (квадратная эстетика: скругление только у тумблера), `motion` (пульс скелетона 1.2 с), плотность веб-панели
  (`density.compact`).
- **Типографика** (база): шкала `.t-*` прототипов; вес связан с ролью шрифта на уровне типов.
- **Контраст** (`contrast.ts`): пары ролей каждой темы проверяются тестом по WCAG (текст 4.5, UI 3).

| Клиент | Как подключает |
|---|---|
| app | `configureDesignSystem` (`src/theme/design-system.ts`); `useTheme()` → семантика; `textStyle(name)`; компоненты `@rkarakulov/ui`; данные — `AsyncContent` + `Skeleton*`; витрина `/ui-kit` = `UiKit` базы (dev) |
| admin | `installDesignSystem()` → `designSystemCss({ theme: 'panel' })` в `<head>`; классы `.t-*`, `.skeleton`; шрифты `src/fonts.ts` |
| landing | `designSystemCss({ theme: 'light', darkTheme: 'dark' })` и шрифты в `Base.astro`; классы `.t-*`, `.skeleton` |

Шрифты на вебе — самохостинг `@fontsource/*` (без внешних CDN). Состояния данных — AGENTS.md §4.12.

Примитивы в приложениях не используются; hex-цвета в TSX/CSS приложений запрещены.

Раздел дополняется по мере реализации; устаревшая схема хуже отсутствующей.
