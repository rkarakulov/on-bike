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

## Дизайн-система (`packages/design-tokens`)

Источник — CSS прототипов (19 экранов, визуальный слой «Ателье»).

- **Слой 1 — примитивы** (`primitives.ts`): нейтральная шкала и акценты, шрифты, `space`, `inset`, `size`,
  `stroke`, `radius` (квадратная эстетика: скругление только у тумблера), `motion` (пульс скелетона 1.2 с),
  плотность веб-панели (`density.compact`).
- **Слой 2 — семантика** (`themes.ts`): роли `text.*`, `surface.*`, `border.*`, `action.*`, `status.*`,
  `map.*`, `surfaceBar.*`, `control.*`, `surface.skeleton` для тем `light` (Jersey Aura), `dark` (Night Ride),
  `protocol` (светлая семантика + `nav.*` тёмной навигации веб-панели).
- **Типографика** (`typography.ts`): шкала `.t-*` прототипов; вес связан с ролью шрифта на уровне типов.
- **Контраст** (`contrast.ts`): пары ролей каждой темы проверяются тестом по WCAG (текст 4.5, UI 3).

| Клиент | Как подключает |
|---|---|
| mobile | `useTheme()` → семантика; `textStyle(name)`; компоненты `apps/mobile/src/components/ui`; данные — `AsyncContent` + `Skeleton*`; витрина `/ui-kit` (dev) |
| admin | `installDesignSystem()` → `designSystemCss({ theme: 'protocol' })` в `<head>`; классы `.t-*`, `.skeleton`; шрифты `src/fonts.ts` |
| landing | `designSystemCss({ theme: 'light', darkTheme: 'dark' })` и шрифты в `Base.astro`; классы `.t-*`, `.skeleton` |

Шрифты на вебе — самохостинг `@fontsource/*` (без внешних CDN). Состояния данных — AGENTS.md §4.12.

Примитивы в приложениях не используются; hex-цвета в TSX/CSS приложений запрещены.

Раздел дополняется по мере реализации; устаревшая схема хуже отсутствующей.
