# on-bike

Платформа для велосипедистов Беларуси: гонки по GPS-коридору, кофе-райды, маршруты, календарь стартов.

Монорепо: `apps/api` (NestJS + воркер BullMQ), `apps/admin` (Vite + React), `apps/landing` (Astro SSR),
`apps/mobile` (Expo, iOS + Android), общие `packages/*`. Правила для людей и агентов — [AGENTS.md](AGENTS.md),
решения — [docs/adr](docs/adr/README.md), обоснование стека — [docs/proposal-stack-architecture.md](docs/proposal-stack-architecture.md).

## Быстрый старт

Нужны Node 24 (`nvm use`), pnpm 11 (`corepack enable pnpm`), Docker.

```bash
pnpm install
pnpm infra:up                           # PostgreSQL 18 + PostGIS, Redis
cp apps/api/.env.example apps/api/.env
pnpm --filter @on-bike/api db:migrate
pnpm dev                                # все приложения
```

| Приложение | Команда                                 | Адрес                           |
| ---------- | --------------------------------------- | ------------------------------- |
| API        | `pnpm dev --filter=@on-bike/api`        | http://localhost:3000/v1/health |
| Панель     | `pnpm dev --filter=@on-bike/admin`      | http://localhost:5173           |
| Лендинг    | `pnpm dev --filter=@on-bike/landing`    | http://localhost:4321           |
| Мобилка    | `pnpm --filter @on-bike/mobile dev`     | QR → Expo Go, `i` / `a` — симуляторы |

Воркер очередей: `pnpm --filter @on-bike/api dev:worker`.

## Проверки

`pnpm check` — формат, lint, границы архитектуры, typecheck, тесты. Запускается в pre-push и в CI.

## Сборки мобильного приложения (EAS)

Один раз: аккаунт Expo (`npx eas-cli login`), затем `npx eas-cli init` в `apps/mobile`.

- `pnpm --filter @on-bike/mobile build:preview` — APK для Android и ad-hoc для iOS (нужен Apple Developer и UDID устройств).
- `pnpm --filter @on-bike/mobile build:testflight` — TestFlight (Apple Developer + запись в App Store Connect).
- `pnpm --filter @on-bike/mobile build:play-internal` — Google Play, внутреннее тестирование (Play Console).
