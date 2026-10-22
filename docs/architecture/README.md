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

Раздел дополняется по мере реализации; устаревшая схема хуже отсутствующей.
