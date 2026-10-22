# F1: репозиторий app-foundation и пакеты — план реализации

> Исполнение: этот план выполняется в той же сессии (inline, TDD), крупные независимые задачи — субагентами.
> Шаги — чек-боксы.

**Цель:** приватное монорепо `~/PROJECTS/app-foundation` с пакетами `@rkarakulov/*`, вынесенными из on-bike
1 в 1, плюс два обобщения: бренд как параметр и мультиязычность. Релиз 0.1.0 готов к публикации.

**Архитектура:** pnpm 11 + turbo, как в on-bike (ADR-0001). Пакеты собираются `tsc` в `dist` (ESM + d.ts);
внутри репо — условие `@app-foundation/source` на `src`. Пакеты RN тестируются jest-expo, остальные — Vitest.
Интеграционные тесты `api-kit` — на реальных PostgreSQL/Redis (`docker compose`).

**Стек:** TypeScript 6, zod 4, NestJS 12 + Fastify, Drizzle 0.45, BullMQ 6, ioredis 6, nodemailer 10,
React 19.3 / RN (Expo SDK 58), changesets, GitHub Packages.

Источник: on-bike `926c468` (ветка `feature/app-foundation`).

---

## Карта файлов

| Пакет | Откуда (on-bike) | Что меняется |
|---|---|---|
| `packages/config` | `packages/config`, `eslint.config.mjs`, `.prettierrc.json` | + пресет eslint `@rkarakulov/config/eslint` (guardrails, запрет hex и примитивов — параметр scope) |
| `packages/design-tokens` | `packages/design-tokens` | роли `map`/`surfaceBar` уходят в проект; `defineThemes`, `neutralThemes`, `FontStack`; contrast/css принимают тему параметром |
| `packages/i18n-core` | `packages/i18n` (механизм) | новый механизм: языки, plural, Intl-форматирование, слияние словарей, тест полноты; словари базы ru/en |
| `packages/contracts-core` | `packages/contracts/src/common.ts` | коды ошибок базы + `defineErrorCodes`/`defineFieldErrorCodes` для расширения |
| `packages/api-client-core` | `packages/api-client/src/index.ts` | без методов домена: `createHttpClient` (`request/get/post`), ошибки, `parseApiError(schema)` |
| `packages/ui` | `apps/mobile/src/components/{ui,async-content,ui-kit}`, `theme/*`, `lib/{calendar-date,text}` | `configureDesignSystem({ themes, fonts, i18n })`; `useTheme<T>()`; `textStyle` по настроенным шрифтам |
| `packages/api-kit` | `apps/api/src/{common,config,infra,http-app.ts}` | `defineEnv(extra)`, `ConfigModule.forRoot(schema)`, `DatabaseModule.forRoot({ schema })`, `configureHttpApp(app, { prefix })` |
| `packages/test-kit` | `apps/api/test/*` | `TestClock`, `FakeMailer`, `waitForLockWaiter`, `recreateTestDatabase`, `truncateAll`, `createApiHarness({ apiModule, workerModule, … })` |

Корень: `package.json`, `pnpm-workspace.yaml` (каталог версий on-bike), `turbo.json`, `eslint.config.mjs`,
`.prettierrc.json`, `.gitignore`, `.githooks` + `scripts/install-git-hooks.mjs` (gitleaks + prettier),
`.changeset/`, `infra/docker-compose.test.yml`, `.github/workflows/{ci,release}.yml`, `README.md`, `AGENTS.md`.

---

### Задача 1. Каркас репозитория

- [ ] `git init` в `~/PROJECTS/app-foundation`, ветка `main`.
- [ ] Корень по образцу on-bike: `package.json` (`name: app-foundation`, private, `packageManager pnpm@11.18.0`,
      `devEngines.runtime` Node ^24.22.0; скрипты `build`, `typecheck`, `test`, `lint`, `format`, `format:check`,
      `check = format:check && lint && typecheck && test`, `changeset`, `release = turbo run build && changeset publish`,
      `infra:up`, `infra:down`, `prepare`).
- [ ] `pnpm-workspace.yaml`: `packages/*`, `nodeLinker: hoisted`, каталог — подмножество каталога on-bike +
      пакеты Expo/RN/jest из `apps/mobile/package.json` (те же версии), `allowBuilds` как в on-bike.
- [ ] `turbo.json` (как в on-bike), `.gitignore`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.nvmrc`.
- [ ] `infra/docker-compose.test.yml`: `imresamu/postgis:18-3.6` (порт 5433, база `foundation_test`),
      `redis:8.8` (порт 6380) — чтобы не конфликтовать с dev-инфраструктурой on-bike.
- [ ] Хуки: `.githooks/pre-commit` (gitleaks protect --staged + prettier --check по staged) из on-bike.
- [ ] `pnpm install` → проходит; `pnpm check` → проходит на пустом наборе пакетов.
- [ ] Коммит: «Каркас app-foundation (источник on-bike 926c468)».

### Задача 2. `@rkarakulov/config`

- [ ] Перенести `tsconfig.library.json`, `tsconfig.react.json`; условие → `@app-foundation/source`.
- [ ] `eslint.js`: экспорт `createEslintConfig({ appGlobs, designTokensPackage })` — правила из `eslint.config.mjs`
      on-bike: guardrails, expo для RN-путей, запрет hex-литералов и импорта `color` из пакета токенов в `appGlobs`.
- [ ] `prettier.json` — из `.prettierrc.json`.
- [ ] Корневой `eslint.config.mjs` базы использует `createEslintConfig` (самопроверка пресета).
- [ ] `pnpm lint` → 0 ошибок. Коммит.

### Задача 3. `@rkarakulov/design-tokens`

Новый публичный API (`src/index.ts`):

```ts
export interface ColorRoles { text; surface; border; action; status; overlay; control } // без map/surfaceBar
export interface NavRoles { /* как в on-bike */ }
export type Theme<Extra extends object = object> = ColorRoles & Extra & { nav?: NavRoles };
export type ThemeSet<T extends Theme = Theme> = { light: T; dark: T } & Record<string, T>;
/** Типизирующая обёртка: проект описывает свои темы и доп. группы ролей. */
export function defineThemes<T extends Theme, S extends ThemeSet<T>>(themes: S): S;
export const neutralThemes: ThemeSet;            // серые on-bike, акцент — синий (контраст ≥ 4.5)
export interface FontStack { display: string; text: string }
export const neutralFontStack: FontStack;        // системные стеки
export type FontRole = 'display' | 'text';
export function contrastPairs(theme: Theme): ContrastPair[];               // роли базы + nav
export function cssVariables(theme: Theme, o: { fontStack: FontStack; scheme: 'light' | 'dark'; dense?: boolean }): string;
export function designSystemCss(o: { themes: ThemeSet; theme: string; darkTheme?: string; fontStack: FontStack; dense?: boolean }): string;
// без изменений: space, inset, size, stroke, radius, motion, density, typography, fontWeights, contrastRatio, WCAG
```

- [ ] Тест (сначала красный): `neutralThemes.light/dark` проходят все `contrastPairs`; `defineThemes` сохраняет
      доп. группы (`map`) в типе (`expectTypeOf`); `cssVariables` содержит `--color-text-accent` и не содержит
      `--density-*` без `dense`; `designSystemCss` с `darkTheme` даёт `@media (prefers-color-scheme: dark)`.
- [ ] Перенести и адаптировать остальные тесты `design-tokens.test.ts` on-bike (типографика, веса шрифтов).
- [ ] Реализация; `color` (палитра нейтрального бренда) остаётся внутренним, не экспортируется.
- [ ] `pnpm --filter @rkarakulov/design-tokens test` → PASS. Коммит.

### Задача 4. `@rkarakulov/i18n-core`

API:

```ts
export type PluralForms = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Dictionary = Record<string, string | PluralForms>;
export type Params = Record<string, string | number>;
export interface I18n<D extends Dictionary> {
  readonly locale: string;
  t<K extends keyof D & string>(key: K, params?: Params): string;  // plural — по params.count
  setLocale(locale: string): void;
  subscribe(listener: () => void): () => void;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDateTime(value: Date, options: Intl.DateTimeFormatOptions & { timeZone: string }): string;
}
export function createI18n<D extends Dictionary>(o: {
  baseLocale: string; dictionaries: { [locale: string]: Partial<D> } & Record<string, D>; locale?: string;
  onMissingKey?: (key: string, locale: string) => void;
}): I18n<D>;
export function mergeDictionaries<A extends Dictionary, B extends Dictionary>(a: A, b: B): A & B;
export function missingKeys(base: Dictionary, other: Partial<Dictionary>): string[];
export function resolveLocale(preferred: readonly string[], supported: readonly string[], fallback: string): string;
export function pluralCategory(locale: string, count: number): Intl.LDMLPluralRule;
export const baseMessages: { ru: BaseMessages; en: BaseMessages };   // строки ui и общих ошибок
export type BaseMessages = typeof baseMessages.ru;
```

- `pluralCategory`: `Intl.PluralRules`, если есть; иначе встроенные правила для ru/be/uk/en (на Hermes
  поддержка `Intl.PluralRules` зависит от версии — источники расходятся, поэтому не зависим от неё).
- [ ] Тесты (сначала красные): интерполяция; plural ru 1/2/5/11/21/22/25 и en 1/2; фолбэк на базовый язык +
      `onMissingKey`; `setLocale` уведомляет подписчиков; `resolveLocale(['be-BY','ru'], ['ru','en'], 'ru')` → `ru`;
      `missingKeys`; полнота `baseMessages.en` относительно `ru`; встроенные правила при выключенном `Intl.PluralRules`.
- [ ] Ключи базы — из `packages/i18n/src/ru.ts` on-bike: `field.errorPrefix`, `state.*`, `date.*` + общие коды
      ошибок `error.*`. Английский перевод.
- [ ] Реализация. Тесты PASS. Коммит.

### Задача 5. `@rkarakulov/contracts-core` и `@rkarakulov/api-client-core`

- [ ] `contracts-core`: `Uuid`, `PageQuery`, `BASE_ERROR_CODES`, `defineErrorCodes(extra)` → `{ ErrorCode, ApiError }`,
      `BASE_FIELD_ERROR_CODES`, `defineFieldErrorCodes(extra)` → `{ FieldErrorCode, ValidationErrorDetails, fieldError }`,
      `RateLimitedDetails`. Тесты из `common.test.ts` on-bike + тест расширения кодами проекта.
- [ ] `api-client-core`: `createHttpClient({ baseUrl, getAccessToken, fetchImpl, errorSchema })` →
      `{ request, get, post }`; `ApiHttpError`, `ApiNetworkError`, `isNetworkError`, `parseApiError(body, schema)`.
      Тесты из `index.test.ts` on-bike без доменных методов.
- [ ] PASS. Коммит.

### Задача 6. `@rkarakulov/ui` (субагент)

- [ ] Перенести компоненты `apps/mobile/src/components/ui/*`, `async-content.tsx`, `ui-kit.tsx` (витрина как
      компонент `UiKit`), `theme/{fonts,motion,theme}.ts`, `lib/{calendar-date,text}.ts` с тестами.
- [ ] `configureDesignSystem({ themes, fonts: FontFamilies, i18n: I18n<UiMessages> })` (факт: `UiMessages` — ключи `BaseMessages` с обычными строками, иначе проект с переопределёнными строками базы не проходит typecheck), где
      `FontFamilies = { [R in FontRole]: Record<FontWeight<R>, string> }`; без вызова — понятная ошибка.
      `useTheme<T extends Theme = Theme>()`, `textStyle(name)`, `useReducedMotion()`, `useLocale()`.
- [ ] Тесты jest-expo: настройка в `jest.setup.ts` с `neutralThemes` и `baseMessages`; все перенесённые тесты PASS;
      новый тест — `textStyle` до `configureDesignSystem` бросает ошибку с подсказкой.
- [ ] Зависимости: peer — `react`, `react-native`, `@react-native-community/datetimepicker`,
      `@react-native-community/netinfo` не нужен (QueryClient остаётся в проекте). Коммит.

### Задача 7. `@rkarakulov/api-kit` (субагент)

- [ ] `config`: `baseEnvShape` (NODE_ENV, PORT, DATABASE_URL, REDIS_URL, TRUST_PROXY, SMTP_URL, MAIL_FROM),
      `defineEnv(extraShape)` → `{ schema, load(source?) }`, токен `ENV`, `ConfigModule.forRoot(schema)`.
- [ ] `clock`, `database` (`DatabaseModule.forRoot({ schema })`, `Executor`, ошибки PG), `outbox` (таблица `outbox`,
      writer, reader, publisher, `OutboxModule`, `OutboxPublisherModule.forRoot({ routes })`), `queue`
      (`QueueModule` без имён очередей проекта), `redis` (`RedisModule`, `RateLimiter`), `mail`
      (`Mailer`, `SmtpMailer`, `MailModule`), `http` (`createFastifyAdapter`, `configureHttpApp(app, { prefix })`),
      `errors` (`DomainError`, `ApiExceptionFilter`, `ZodValidationPipe`).
- [ ] Тесты: все unit и интеграционные тесты этих файлов из on-bike (outbox publisher, rate limiter) на тестовой
      инфраструктуре базы. PASS. Коммит.

### Задача 8. `@rkarakulov/test-kit` (субагент, после задачи 7)

- [ ] `TestClock`, `FakeMailer`, `waitForLockWaiter`, `recreateTestDatabase({ url, migrationsFolder })` (с проверкой
      суффикса `_test`), `truncateAll(pool, { except })`, `createApiHarness({ apiModule, workerModule, env, overrides })`.
- [ ] Тест: харнесс поднимает минимальный модуль с `OutboxModule` и пишет/читает событие. PASS. Коммит.

### Задача 9. CI, релиз, документация

- [ ] `.github/workflows/ci.yml`: `pnpm check` с сервисами PostGIS и Redis.
- [ ] `.github/workflows/release.yml`: changesets/action → `pnpm release` в GitHub Packages (`publishConfig.registry`).
- [ ] Каждый пакет: `publishConfig: { registry: https://npm.pkg.github.com, access: restricted }`, `files: ["dist"]`,
      `repository`. Changeset 0.1.0 на все пакеты.
- [ ] `README.md` (что такое база, как подключить пакеты: `.npmrc`, токен, исключение возраста версий), `AGENTS.md`
      базы (инварианты: перенос без домена, API пакетов — semver, тест на каждое поведение).
- [ ] `pnpm build && pnpm -r publish --dry-run --no-git-checks` → проходит. Коммит.

### Задача 10. Проверка и ревью

- [ ] `pnpm check` в базе — PASS; on-bike не тронут.
- [ ] Независимое ревью (independent-reviewer) по design.md и этому плану. Исправить CRITICAL/HIGH.
- [ ] Гейт человека: создание приватного репо `rkarakulov/app-foundation`, push, первая публикация.
