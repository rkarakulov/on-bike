# F4: перевод on-bike на базу app-foundation

## 1. Title
on-bike на пакетах `@rkarakulov/*` 0.1.0 (ADR-0004, F4).

## 2. Goal
Общий код (инфраструктура API, тестовый стенд, дизайн-система, локализация, ядра контрактов и клиента) берётся
из базы `rkarakulov/app-foundation`, а не живёт копией в on-bike. Поведение on-bike не меняется.
Дизайн: [`../2026-10-22-app-foundation/design.md`](../2026-10-22-app-foundation/design.md) §4 (F4).

## 3. Scope
- **Пакеты on-bike становятся тонкими слоями над базой** (пути импорта в приложениях сохраняются):
  - `@on-bike/design-tokens` — бренд: палитра Jersey Aura / Night Ride, темы `light`/`dark`/`protocol` через
    `defineThemes`, группы ролей `map` и `surfaceBar`, пары контраста этих групп, `fontStack`; реэкспорт токенов
    базы; обёртка `designSystemCss({ theme, darkTheme })` с брендом (admin и landing не меняются).
  - `@on-bike/i18n` — словарь on-bike, слитый с `baseMessages` (`mergeDictionaries`), экземпляр `createI18n`
    (ru), прежний `t(key, params)`; строки, которые есть в базе (`state.*`, `date.*`, `field.datePlaceholder`…),
    удаляются из словаря on-bike, если совпадают.
  - `@on-bike/contracts` — `common.ts` на `defineErrorCodes`/`defineFieldErrorCodes` (коды on-bike — расширение),
    `PageQuery`/`Uuid`/`RateLimitedDetails` из `contracts-core`.
  - `@on-bike/api-client` — `createHttpClient` + методы домена; ошибки (`ApiHttpError`, `isNetworkError`…) — из
    `api-client-core` (реэкспорт).
- **apps/api** — `src/{config,infra,common,http-app.ts}` → `@rkarakulov/api-kit` (`defineEnv` с переменными on-bike,
  `ConfigModule.forRoot`, `DatabaseModule.forRoot({ schema })`, outbox из `@rkarakulov/api-kit/outbox-schema`,
  `ApiExceptionFilter` + `API_ERROR_MESSAGES` on-bike, `ZodValidationPipe` с кодами полей on-bike); `QUEUE` —
  остаётся в on-bike. `test/harness.ts` → `createApiHarness` из `@rkarakulov/test-kit` (обёртка с хелперами
  identity остаётся). Миграции не меняются: `drizzle-kit generate` после перевода — «нет изменений».
- **apps/mobile** — `src/components/ui/*`, `async-content`, `ui-kit` (витрина → `UiKit` базы), `theme/{theme,motion}`,
  `lib/{calendar-date,text}` → `@rkarakulov/ui`; `configureDesignSystem({ themes, fonts, i18n })` в корневом модуле
  до первого рендера; `useTheme<OnBikeTheme>()` там, где нужны `map`/`surfaceBar`; `fontAssets` (Inter, Playfair)
  остаются в on-bike; jest: `transformIgnorePatterns` с `@rkarakulov/.*`, настройка в `jest.setup.ts`.
- **Подключение реестра** — `.npmrc` (`@rkarakulov:registry=https://npm.pkg.github.com`, токен из
  `NODE_AUTH_TOKEN`), `minimumReleaseAgeExclude: ['@rkarakulov/*']` в `pnpm-workspace.yaml`, CI on-bike читает
  пакеты (`NODE_AUTH_TOKEN`), `docs/runbooks/local-dev.md` — как получить токен.

## 4. Out of Scope
- Шаблон copier и `.copier-answers.yml` (F3 ещё не сделан) — принятие шаблона on-bike откладывается до F3.
- Переключение AI-инфраструктуры на плагин `app-dev-kit` (`.claude/{commands,agents,skills,hooks}`, адаптеры Codex
  в `.agents/`/`.codex/` читают эти файлы) — вместе с F3, где решается источник текстов для Codex.
- Identity, tracks, экраны и тексты продукта — без изменений (identity в базу — F6).
- ESLint-пресет базы (`createEslintConfig`) — текущий `eslint.config.mjs` on-bike работает, перенос — с F3.
- Удаление Astro-лендинга (ADR-0003) — отдельная задача-основа universal-app (F5).

## 5. Architecture Context
- Пакеты: design-tokens, i18n, contracts, api-client (on-bike) → зависят от `@rkarakulov/*` 0.1.0.
- API: инфраструктура `src/infra/*` уходит; модули identity/health/tracks импортируют из `@rkarakulov/api-kit`
  (`DB`, `CLOCK`, `OutboxWriter`, `RateLimiter`, `MAILER`, `DomainError`, `ENV`…). Тип `Env` on-bike — из `defineEnv`.
- Mobile: компоненты дизайн-системы — из пакета; экраны и features on-bike не меняются, кроме импортов.
- Контракты API и миграции — без изменений (совместимость установленных клиентов сохраняется).

## 5.1 Placement & Reuse Gate
- Переиспользуем: всё из пакетов базы; копии в on-bike удаляются, а не остаются рядом (дубли запрещены).
- В on-bike остаётся только бренд, домен, тексты, композиция модулей (`AppModule`, `WorkerModule`, `QUEUE`, маршруты
  outbox) и тестовые хелперы домена.
- Нужно изменение в общем коде — задача и релиз в app-foundation, не правка в `node_modules`/копии.

## 6. Relevant Files
- `packages/design-tokens/src/*` — бренд поверх базы.
- `packages/i18n/src/{index,ru}.ts` — словарь и экземпляр i18n.
- `packages/contracts/src/common.ts`, `packages/api-client/src/index.ts` — расширения ядер.
- `apps/api/src/{app.module,worker.module,main,worker,http-app}.ts`, `apps/api/src/config/env.ts` — композиция и env.
- `apps/api/src/infra/**`, `apps/api/src/common/**` — удаляются (заменяются api-kit).
- `apps/api/test/{harness,db,global-setup,test-env}.ts` — на test-kit.
- `apps/mobile/src/components/**`, `apps/mobile/src/theme/*`, `apps/mobile/src/app/_layout.tsx`, `apps/mobile/jest.*`.
- `.npmrc`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`, `docs/runbooks/local-dev.md`.

## 7. Implementation Notes
- Пакеты `@rkarakulov/*` — ESM; Metro транспилирует их сам, jest-expo — только с `transformIgnorePatterns`.
- `@rkarakulov/ui` бросает ошибку без `configureDesignSystem` — вызов в модуле, который импортирует `_layout.tsx`
  первым, и в `jest.setup.ts`.
- Тексты ui-компонентов on-bike совпадают со строками базы — проверить тестами экранов (регрессия текста = дефект).
- Фильтр ошибок базы берёт сообщения из `API_ERROR_MESSAGES` — перенести тексты кодов on-bike.
- `ZodValidationPipe(schema, FieldErrorCode)` — второй аргумент обязателен для кодов `AGE_BELOW_18`, `CONSENT_REQUIRED`.

## 8. Risks / Assumptions / Open Questions
- **Предусловие:** пакеты 0.1.0 опубликованы (PR «Релиз пакетов» в app-foundation слит человеком).
- **Доступ к реестру:** локально нужен токен со scope `read:packages` (`gh auth refresh -s read:packages` — действие
  человека); в CI — доступ репозитория on-bike к каждому пакету (Package settings → Manage Actions access) или
  секрет с токеном — решение и действие человека.
- Риск: различия поведения при переносе (сообщения ошибок, строки) — ловятся существующими тестами on-bike
  (api 74, mobile 130) + `drizzle-kit generate` без изменений + ручной смоук на Android.
- Риск: `outbox` в схеме проекта через реэкспорт — `drizzle-kit` должен видеть ту же таблицу и индекс.

## 8.1 Requirements Consistency
Заполняет architect.

## 8.2 Deviations from spec
- F4 выполняется до F3 (шаблон) по решению человека 2026-10-22 («потом перевод on-bike на базу»): принятие шаблона и
  переключение AI-инфраструктуры перенесены в F3 — design.md §4 обновить.

## 8.3 Security checklist
Затронуты инфраструктура и секреты (токен реестра пакетов), аутентификация — косвенно (код identity не меняется,
меняется источник `DomainError`/фильтра/лимитера).
- AuthN/AuthZ: без изменений; JWT/сессии — код identity on-bike.
- Входные данные: `ZodValidationPipe` базы с кодами on-bike — тесты валидации identity.
- Данные наружу: формат ошибок — тот же конверт; тексты — `API_ERROR_MESSAGES`; стек/SQL не уходят (тест базы).
- Злоупотребления: `RateLimiter` и `TRUST_PROXY` по хопам — из api-kit; e2e-тест подмены XFF on-bike остаётся.
- Секреты и логи: `NODE_AUTH_TOKEN` только из env/секретов CI, не в `.npmrc` и git; gitleaks.
- Аудит: не затронут.

## 9. Acceptance Criteria
1. В on-bike нет копий кода базы: `apps/api/src/infra`, `apps/api/src/common`, `apps/mobile/src/components/ui`
   удалены; импорты — из `@rkarakulov/*`.
2. `pnpm check` on-bike зелёный; число тестов не меньше прежнего за вычетом перенесённых в базу тестов
   инфраструктуры и компонентов (перечислить в §12).
3. `drizzle-kit generate` — «No schema changes».
4. Ручной смоук на Android (Expo Go): splash → Главная, регистрация → письмо в Mailpit → подтверждение → вход.
5. `pnpm install` в CI on-bike получает пакеты из GitHub Packages; CI зелёный.
6. Токен реестра нигде не закоммичен (gitleaks, `.npmrc` с `${NODE_AUTH_TOKEN}`).

## 10. Documentation Impact
- `docs/runbooks/local-dev.md` — токен реестра, `.npmrc`.
- `docs/architecture/README.md`, `AGENTS.md` §2 — где живёт общий код (база), что остаётся в on-bike.
- `docs/tasks/2026-10-22-app-foundation/design.md` §4 — F4 до F3.

## 11. Implementation Context
Заполняет architect.

## 12. Outcome
Заполняет coder.
