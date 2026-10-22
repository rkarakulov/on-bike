# AGENTS.md — канон для всех агентов on-bike

Единственный источник правил для Claude Code, Codex и любого другого агента.
`CLAUDE.md` — тонкий указатель сюда. Детали по зонам — в `.claude/rules/*.md`.

## 0. Порядок приоритетов

1. Явная инструкция человека в текущей сессии.
2. Этот файл (инварианты, safety, completion gate).
3. `.claude/rules/<зона>.md` для затронутых путей.
4. Принятые ADR в `docs/adr/`.
5. Продуктовые документы `docs/product/` (PRD, epics, архитектурный спайн).
6. Существующий код и его конвенции.

Конфликт между уровнями — остановись и вынеси человеку с рекомендацией; не выбирай молча.

## 1. Проект кратко

on-bike.by — геймифицированная платформа для велосипедистов Беларуси: гонки по GPS-коридору,
кофе-райды, библиотека маршрутов, календарь стартов, единый профиль райдера.
Аудитория — только Беларусь, UI полностью на русском, формальное «вы».

Ключевые продуктовые рамки MVP (из прототипов):

- приложение **не записывает GPS** — заезд загружается файлом (FIT/GPX/TCX) с часов/велокомпьютера;
- **нет push, WebSocket, BLE, Strava/Garmin API** — уведомления только in-app, статусы — polling;
- результаты гонок считает **только сервер**; клиент никогда не диктует итог;
- модерация — по жалобам, своя очередь в каждом модуле (без сквозного сервиса).

## 2. Структура репозитория

```
apps/
  api/        NestJS 12: src/main.ts (HTTP) + src/worker.ts (BullMQ); модули в src/modules/<context>
  admin/      Vite + React — веб-панель организаторов «Протокол» (desktop, только светлая тема)
  landing/    Astro SSR — гостевые страницы по ссылкам, удаление аккаунта, OG-мета
  mobile/     Expo SDK 58 + Expo Router (iOS, Android)
packages/
  contracts/     zod-схемы — источник правды API (DTO, enum-ы, коды ошибок)
  api-client/    клиент + TanStack Query hooks поверх contracts
  tracks/        парсинг GPX/TCX/FIT/KML, геометрия
  design-tokens/ Jersey Aura / Night Ride / «Протокол»
  i18n/          русские строки
  config/        пресеты tsconfig (eslint и prettier — общие, в корне)
infra/        docker-compose (dev/stage/prod), Caddy, бэкапы
docs/         product, architecture, adr, tasks, runbooks
tools/ai_review/  контракт независимого ревью + Codex-мосты
```

Имена пакетов — `@on-bike/<name>`. Node 24 (`.nvmrc`), pnpm 11, Turborepo.

## 3. Команды

| Команда | Что делает |
|---|---|
| `pnpm install` | установка зависимостей |
| `pnpm dev` | все приложения в dev через turbo (сначала собирает `packages/*`) |
| `pnpm dev --filter=@on-bike/<app>` | одно приложение в dev (api / admin / landing / mobile) |
| `pnpm build` | production-сборка всех приложений |
| `pnpm --filter @on-bike/mobile build:preview` | EAS: APK + iOS ad-hoc для внутренних тестеров |
| `pnpm infra:up` | docker compose: PostgreSQL 18 + PostGIS, Redis |
| `pnpm check` | **completion gate**: lint + typecheck + test + arch:check + format:check |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | по отдельности |
| `pnpm format` | prettier --write |
| `pnpm arch:check` | dependency-cruiser |
| `pnpm --filter @on-bike/api db:generate` | сгенерировать миграцию Drizzle |
| `pnpm --filter @on-bike/api db:migrate` | применить миграции |
| `pnpm --filter @on-bike/<pkg> <script>` | скрипт одного пакета |

Не выдумывай команды. Нет скрипта — так и напиши.

## 4. Архитектурные инварианты

1. **Серверный авторитет результатов.** Трек валидируется и пересчитывается только на сервере.
   Клиент отправляет файл, но не время, место или кластер.
2. **Append-only аудит.** Споры, исключения/восстановления треков, пересчёты, решения модерации —
   только вставка новых записей; UPDATE/DELETE истории запрещены.
3. **Contracts-first.** Любое изменение API начинается со схемы в `packages/contracts`.
   NestJS валидирует по ней, клиенты потребляют её же. Ручные копии DTO запрещены.
4. **Границы модулей.** Модуль `apps/api/src/modules/<a>` импортирует `<b>` только через
   `modules/<b>/index.ts`. Приложения не импортируют друг друга. `packages/*` не импортируют `apps/*`.
   Проверяется `pnpm arch:check`.
5. **Пакет выделяется,** только когда его используют ≥2 приложения. Модули API — папки, не пакеты.
6. **Очереди.** Тяжёлое и асинхронное (разбор трека, геопересчёт, карточки Skia/ffmpeg, OG,
   бейджи, уведомления, пересчёт сезона) — задачи BullMQ в `worker`. Задачи идемпотентны.
   RabbitMQ не используем; доменные события — через transactional outbox в Postgres.
7. **Миграции** — отдельный шаг деплоя, никогда при старте сервиса. Деструктивные — только с человеком.
8. **Время** храним в UTC, показываем в Europe/Minsk.
9. **Секреты** никогда не попадают в git, логи, task.md и ответы. Только `.env*` вне git и
   переменные окружения.
10. **Нет «на вырост».** Не добавляй push, WebSocket, GPS-запись, внешние IdP и т.п. без ADR.

## 5. Workflow

Точка входа — `/develop-task <задача>` (в Codex — `$develop-task`). Он выбирает уровень:

| Уровень | Когда | Команда |
|---|---|---|
| 1 | механическая правка, без смены поведения | `/task1` |
| 2 | понятная задача, нужен план | `/task2` — plan → task.md → inline → reviewer |
| 3 | несколько модулей, миграции, контракты, безопасность | `/task3` — architect → coder → reviewer |

Артефакты задачи: `docs/tasks/<YYYY-MM-DD>-<slug>/{task.md,findings.md,pr.md}` — коммитятся.
Шаблон — `.claude/task-template.md`. Независимое ревью — `tools/ai_review/review_contract.md`.

Requirements Sanity Check обязателен: противоречия в требованиях, конфликт с инвариантами,
недоопределённость, вредные решения — выносить человеку прямо, с 2–3 альтернативами и рекомендацией.

Зависимость: плагин **superpowers** (brainstorming, writing-plans, test-driven-development,
systematic-debugging, verification-before-completion, receiving-code-review,
finishing-a-development-branch). Если его нет — выполни ту же фазу вручную, фазу не пропускай.

## 6. Completion gate

- Задача не «готова» без фактического вывода `pnpm check` (зелёного) в отчёте.
- Если проверка не запускалась или упала по внешней причине — пиши `NOT VERIFIED` + причина.
- Новое поведение — с тестами. Багфикс — сначала падающий тест.
- Независимое ревью без нерешённых CRITICAL/HIGH.
- Изменения миграций / env / конфигов явно описаны в `pr.md`.

## 7. Git и safety

- GitHub. Ветки `feature/<slug>`, `fix/<slug>`; `main` защищён.
- Коммит в рабочую ветку и draft-PR через `gh` — можно. **Push и merge — только с явного «да» человека.**
- Запрещено без человека: `git push --force`, `git rebase`, `git reset --hard`, merge PR,
  деплой, деструктивные миграции, удаление данных, смена секретов и инфраструктуры.
- `git add` — по конкретным путям, не `-A`.
- Стоп и вопрос человеку: требование противоречит инварианту §4; нужен новый внешний сервис;
  задача выросла за scope; проверка красная по непонятной причине.

## 8. Индекс правил

| Файл | Зона |
|---|---|
| `.claude/rules/backend.md` | `apps/api/**` |
| `.claude/rules/db.md` | миграции, Drizzle-схемы, PostGIS |
| `.claude/rules/contracts.md` | `packages/contracts/**` |
| `.claude/rules/mobile.md` | `apps/mobile/**` |
| `.claude/rules/web.md` | `apps/admin/**`, `apps/landing/**` |
| `.claude/rules/tests.md` | все тесты |
| `.claude/rules/security.md` | auth, загрузка файлов, персональные данные |

Скилы: `.claude/skills/backend-nest`, `web-ui`, `mobile-expo`. Агенты: `.claude/agents/`.
Codex-адаптеры: `.agents/skills/`, `.codex/`. Соответствие Claude ↔ Codex — `.claude/ai-runtime.md`.

## 9. Карта документации

- `docs/README.md` — индекс.
- `docs/product/` — PRD, epics, архитектурный спайн (источник продуктовых решений).
- `docs/architecture/` — текущая архитектура системы.
- `docs/adr/` — принятые решения (`0001-stack-and-monorepo.md`).
- `docs/tasks/` — артефакты задач.
- `docs/runbooks/` — эксплуатация.

Читай 1–4 релевантных документа, не всю папку. Нет документа — не выдумывай содержимое, зафиксируй gap.

## 10. Формат финального ответа

Что сделано · какие файлы · какие проверки с результатом (или `NOT VERIFIED`) ·
итог ревью · что осталось открытым. Коротко, по-русски.
