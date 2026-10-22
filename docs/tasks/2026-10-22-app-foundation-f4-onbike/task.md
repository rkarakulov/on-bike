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
- **jest (architect):** шаблон `transformIgnorePatterns` из README базы теряет записи пресета jest-expo 58
  (`@sentry/react-native|native-base|standard-navigation` и две отдельные записи
  `/node_modules/react-native-reanimated/plugin/`, `/node_modules/@react-native/babel-preset/`; on-bike использует
  reanimated). Брать полный список пресета (`node_modules/jest-expo/jest-preset.js:144-150`) и добавлять
  `@rkarakulov` в первую запись — см. §8.1 п. 6.
- **Ошибки клиента (architect):** `createHttpClient` бросает `ApiHttpError` базы; подкласс в on-bike ломает
  `instanceof` (рантайм-ошибки — экземпляры базового класса). Код ошибки — через типизированный разбор
  `parseApiError(error.body, ApiError)` (§8.1 п. 5).
- **design-tokens (architect):** только явные именованные реэкспорты из базы, без `export *` — у базы есть
  `contrastPairs`/`cssVariables`/`designSystemCss` с другими сигнатурами; публичный API `@on-bike/design-tokens`
  для приложений (`themes`, токены, `typography`, `designSystemCss({ theme, darkTheme })`, `color` под запретом
  ESLint) сохраняется. `designSystemCss` on-bike = базовый с `themes`, `fontStack` и `dense: theme === 'protocol'`.
- **Токены DI (architect):** `ENV`, `DB`, `PG_POOL`, `CLOCK`, `MAILER`, `REDIS` — только из `@rkarakulov/api-kit`;
  свой `Symbol('ENV')` в on-bike = DI-ошибка «can't resolve».

## 8. Risks / Assumptions / Open Questions
- **Предусловие:** пакеты 0.1.0 опубликованы (PR «Релиз пакетов» в app-foundation слит человеком).
- **Доступ к реестру:** локально нужен токен со scope `read:packages` (`gh auth refresh -s read:packages` — действие
  человека); в CI — доступ репозитория on-bike к каждому пакету (Package settings → Manage Actions access) или
  секрет с токеном — решение и действие человека.
- Риск: различия поведения при переносе (сообщения ошибок, строки) — ловятся существующими тестами on-bike
  (api 74, mobile 130) + `drizzle-kit generate` без изменений + ручной смоук на Android.
- Риск: `outbox` в схеме проекта через реэкспорт — `drizzle-kit` должен видеть ту же таблицу и индекс.
- **EAS Build (architect):** облачная сборка тоже делает `pnpm install` — без переменной `NODE_AUTH_TOKEN`
  (EAS env, видимость secret, токен `read:packages`) `build:preview`/`build:*` падают. Действие человека;
  в runbook — строка. На AC4 (Expo Go) не влияет.
- **Ветка (architect):** `feature/onbike-on-foundation` стоит поверх незалитых draft-PR #1–#4 (`main` = каркас);
  design.md §4 требует их слияния до F4 — см. §8.1 п. 2.
- **CJS → ESM (architect):** `apps/api` собирается в CommonJS (`.swcrc`), пакеты базы — только ESM; работает через
  `require(esm)` Node ≥ 22.12 (так on-bike уже грузит `@on-bike/contracts` из `dist`). drizzle-kit 0.31 грузит
  схему через tsx — реэкспорт `outbox` из `dist` проверяется AC3.
- **Одна копия зависимостей (architect):** `@nestjs/*`, `drizzle-orm`, `react`, `react-native`, `zod` — peer у пакетов
  базы; после install `pnpm why @nestjs/core drizzle-orm react zod` — по одной версии (иначе DI-токены/`is()` drizzle
  и хуки React ломаются молча).

## 8.1 Requirements Consistency

**Architecture Review — app-foundation-f4-onbike. Status: CONCERNS** (блокеров для coder нет; предусловия §8 —
публикация 0.1.0, токен, доступ Actions — действия человека; решения ниже — рекомендации architect, человек может
переиграть до старта S1).

1. **Конфликт с инвариантом и правилами (HIGH).** После F4 «общий код — только в базе» (ADR-0004, Последствия), а
   `AGENTS.md` §4.11 велит «компонент в `components/ui` с тестом и примером на витрине», §2 описывает
   `src/infra`; `.claude/rules/backend.md:18` («инфраструктура — `src/infra/`»), `db.md:5` и `security.md:5`
   (`apps/api/src/infra/**`) указывают на удаляемые пути — зона security-ревью инфраструктуры перестанет
   срабатывать; `mobile.md:22-35`, `web.md:30-33`, скилы `mobile-expo`/`web-ui`/`backend-nest` ссылаются на
   `src/components/ui`, `async-content.tsx`, `src/infra/`. §4 переносит в F3 только переключение на плагин —
   **правила и AGENTS.md остаются контентом проекта и обновляются в F4** (текст и `paths:`, без смены механики).
   Рекомендация для §4.11: общий компонент/токен — задача и релиз в app-foundation; бренд (роль группы `map`,
   палитра) — `@on-bike/design-tokens`; компонент только для on-bike — `apps/mobile/src/components/` с тестом.
   `security.md` `paths:` → `apps/api/src/{config,db}/**`, `apps/api/src/{app,worker}.module.ts`, `.npmrc`,
   `pnpm-workspace.yaml`, `.github/workflows/**`.
2. **Противоречие в источнике.** design.md §4: F4 зависит от F3 и «PR #1–#3 вливаются в `main` до F4»; факт — F4 до
   F3 (§8.2, решение человека), а ветка стоит поверх незалитых draft-PR #1–#4. Варианты: (а) человек сливает
   #1–#4, PR F4 — в `main` (рекомендуется: чистый дифф, ревью только F4); (б) PR F4 в базу
   `feature/app-foundation` (стек), отметить в `pr.md`; (в) rebase — запрещён AGENTS §7. design.md §4 обновить
   (уже в §8.2/§10).
3. **Недоопределено: ключи ошибок полей и действий.** База: `field.error.*`, `error.*`; on-bike: `auth.field.*`,
   `auth.error.*` (не совпадают по ключу — правило §3 «удалять совпадающие» их не задевает). Тексты совпадают,
   кроме `INVALID_DATE`: on-bike «Проверьте дату рождения.», база «Проверьте дату.». Варианты:
   **A** — оставить `auth.field.*`/`auth.error.*` как есть (features не меняются, §5); **B** — перевести
   `error-messages.ts` на ключи базы, для `INVALID_DATE` оставить on-bike-ключ; **C** — глобально переопределить
   `field.error.INVALID_DATE` — вредно: все будущие поля дат скажут «дату рождения». **Рекомендация: A**; B — в F6
   (identity в базу), где эти тексты переезжают вместе с identity.
4. **Недоопределено: тексты витрины.** Витрина → `UiKit` базы, у него свои ключи. 17 ключей `uiKit.*` совпадают
   с базой по ключу и тексту (дубли — удаляются), 16 различаются (`kicker`, `primary` «Участвовать», `secondary` «Я иду»,
   `textAction`, `kickerTag`, баннеры, `fieldEmailPlaceholder`, `fieldDisabled` «Класс велосипеда», `going`,
   `empty*`), ключей `pillVerified/pillStart/pillDq/pillRevised`, `chipGravel/chipNearby`,
   `segment.strong/medium/beginner` в базе нет; `uiKit.going` в базе — множественная форма (`PluralForms`), у
   on-bike — строка «идут 12» (переопределение строкой ломает `UiMessages` и `count`). Варианты: **A** — тексты
   базы, все `uiKit.*` on-bike удаляются (`uiKit.open` для ссылки с Главной есть в базе тем же текстом); в
   `__tests__/ui-kit.test.tsx` «Класс велосипеда» → «Категория»; **B** — переопределить 16 различающихся ключей
   текстами on-bike (`going` — как `PluralForms`); **C** — оставить свою витрину — запрещённый дубль.
   **Рекомендация: A** (экран только в dev; витрина принадлежит базе, её тексты — нейтральные). Человек может
   выбрать B — тогда тест витрины не меняется.
5. **Вредное решение-ловушка: типизация `ApiHttpError`.** `ApiHttpError<Code = string>` базы: `apiError.code` —
   `string` → `apiErrorCode(): ErrorCode | 'UNKNOWN'` (`apps/mobile/src/features/auth/error-messages.ts:38-40`) не
   типизируется. Подкласс `class ApiHttpError extends Base` в `@on-bike/api-client` — **ловушка**: рантайм-ошибки
   создаёт `createHttpClient` базы → `instanceof` подкласса = false → вся обработка ошибок API молча
   превращается в «Что-то пошло не так». Кроме того, `new ApiHttpError(409, body)` в тестах без схемы разбирает
   код по `BaseApiError` → `EMAIL_TAKEN` станет `UNKNOWN`. Варианты: **A** — в `@on-bike/api-client` функция
   `apiErrorOf(error): ParsedApiError<ErrorCode> | undefined` (`instanceof ApiHttpError` базы +
   `parseApiError(error.body, ApiError)`); `error-messages.ts` берёт код и `details` из неё; тесты экранов не
   меняются; **B** — во всех тестах передавать `ApiError` третьим аргументом и кастовать `apiError.code`;
   **C** — подкласс — отклонён. **Рекомендация: A** (одна функция, разбор не зависит от того, кто создал ошибку).
6. **Недоопределено в базе: jest.** README базы и `smoke/jest/jest.config.cjs` дают сокращённый
   `transformIgnorePatterns` (нет `@sentry/react-native|native-base|standard-navigation` и двух записей про
   reanimated plugin и `@react-native/babel-preset`). Для on-bike — полный список пресета jest-expo 58 +
   `@rkarakulov` (§7). Follow-up в app-foundation: README/smoke/шаблон F3.
7. **Конфликт с кодом: dependency-cruiser.** Правило `contracts-pure` (`.dependency-cruiser.cjs:44-49`) запрещает
   `packages/contracts` любые npm-зависимости, кроме zod → импорт `@rkarakulov/contracts-core` даст ошибку
   `arch:check`. Расширить `pathNot` до `node_modules/(zod|@rkarakulov/contracts-core)/` (contracts-core сам —
   чистый zod).
8. **Пробел в тестах: сообщения кодов on-bike.** Фильтр базы берёт текст `EMAIL_TAKEN`/`EMAIL_UNAVAILABLE`/
   `LINK_EXPIRED` из `API_ERROR_MESSAGES`; забытый провайдер даст «Конфликт»/«Не найдено» по статусу, а тесты это не
   поймают (`message: expect.any(String)` — `registration.int.test.ts:117`, `verification.int.test.ts:103`).
   Ужесточить эти два ассерта до точных текстов (проверяют DI-связку фильтра и словаря в `AppModule`) +
   `ON_BIKE_ERROR_MESSAGES satisfies Record<Exclude<ErrorCode, BaseErrorCode>, string>`.
9. **Уточнение §7: `ZodValidationPipe`.** Второй аргумент `FieldErrorCode` передавать во **всех четырёх** местах
   (`auth.controller.ts:32,50,59,68`), не только для `RegisterRequest`: иначе новый код поля проекта в любой схеме
   молча станет `INVALID`. Регрессию по `AGE_BELOW_18`/`CONSENT_REQUIRED` ловит `registration.int.test.ts:89-94`.
10. **Неточность §3 (api).** «`src/config` → api-kit» — уходит только `config/config.module.ts`; `config/env.ts`
    остаётся: `defineEnv({ ...mailEnvShape, JWT_SECRET, EMAIL_TOKEN_SECRET, APP_LINK_BASE, AGREEMENT_VERSION })`,
    экспорт `env` (определение), `Env`, `loadEnv`. Сообщения валидации (`'не короче 32 символов'`, regex
    `APP_LINK_BASE`) — без изменений. `ENV` — только из api-kit (§7).
11. **Placement после удаления `src/infra` (AC1).** То, что остаётся в on-bike, — файлы композиции в корне `src/`,
    не знающие о модулях: `src/queues.ts` (`QUEUE`), `src/db/schema.ts` (реэкспорт `outbox` — его читает
    drizzle-kit; таблицы модулей — по-прежнему `modules/*/*.schema.ts`), `src/db/index.ts` (`schema`,
    `type Database = Database<typeof schema>`, `type DbExecutor = DbExecutor<typeof schema>`),
    `src/error-messages.ts`. Схема `DatabaseModule.forRoot` — та же, что сейчас (`{ outbox }`), «1 в 1».
12. **Пробел scope: `@on-bike/config`.** `packages/config/tsconfig.{library,react}.json` — копия
    `@rkarakulov/config` + `customConditions` → AC1 («нет копий») формально нарушен. Варианты: (а) отложить в F3
    вместе с ESLint-пресетом и записать в §8.2 (рекомендуется — tsconfig шаблон F3 перепишет);
    (б) `extends: "@rkarakulov/config/tsconfig.library.json"` + `customConditions` — 2 строки, но тянет peer-зависимости
    ESLint-пресета.
13. **Пробелы базы (не блокируют F4, follow-up в app-foundation).** `UiKit` без слота для компонентов проекта
    (§4.11 «пример на витрине» для on-bike-компонента — некуда); в test-kit нет «хелперов jest-expo» (design.md §1)
    → моки `jest.setup.ts` on-bike остаются; `foundation:link` и запрет `link:` в CI (design.md §3) не реализованы →
    не часть F4.
14. **LOW.** `DomainError<string>` теряет проверку кода при компиляции → типизированная фабрика
    `domainError(code: ErrorCode, status, details?)` в `src/error-messages.ts` (или `new DomainError<ErrorCode>`);
    `DateField` базы передаёт iOS-пикеру `locale="ru"` вместо `"ru-RU"` — визуально то же, проверить в смоуке;
    `dense` базы применяется и к блоку `darkTheme` — у on-bike `protocol` без тёмной темы, разницы нет
    (подтверждает golden-CSS).

## 8.2 Deviations from spec
- F4 выполняется до F3 (шаблон) по решению человека 2026-10-22 («потом перевод on-bike на базу»): принятие шаблона и
  переключение AI-инфраструктуры перенесены в F3 — design.md §4 обновить.
- Решения по вопросам architect (§8.1), приняты автором по рекомендациям (режим «автономно», 2026-10-22):
  1. Ключи ошибок полей и действий — остаются `auth.field.*` / `auth.error.*`; перевод на `field.error.*` — в F6.
  2. Витрина `/ui-kit` — тексты базы (`uiKit.*` on-bike удаляются); в тесте «Класс велосипеда» → «Категория».
  3. PR F4 — стеком в `feature/app-foundation` (#1–#4 не слиты; rebase запрещён §7); перебазирование на `main` —
     слиянием после вливания стека человеком.
  4. `@on-bike/config` — остаётся до F3 (вместе с ESLint-пресетом базы); AC1 для него не применяется.
  5. Правила и `AGENTS.md` с путями удаляемого кода (`.claude/rules/*` `paths:`, §2, §4.11) — обновляются в F4
     (находка HIGH architect), переключение на плагин — F3.
  6. EAS Build: секрет `NODE_AUTH_TOKEN` — действие человека перед первой сборкой EAS (follow-up, не блокирует F4).
- Предусловия выполнены: пакеты 0.1.0 опубликованы; доступ Actions on-bike к пакетам открыт человеком; локальный токен
  `read:packages` и строка авторизации в `~/.npmrc` — есть.

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

Заполнил architect по коду on-bike (`feature/onbike-on-foundation`) и app-foundation (`main`, 0.1.0). Решения §8.1
п. 3–5 приняты по рекомендации (A/A/A), п. 12 — (а); если человек выберет иначе — поправить S2/S4.

### Порядок реализации (слайсы; после каждого — своя проверка и коммит)

| # | Слайс | Проверка после слайса |
|---|---|---|
| S0 | Предусловия: 0.1.0 опубликованы; `NODE_AUTH_TOKEN` локально; решён п. 2 §8.1 (база PR). Снять эталоны: `pnpm check` (числа тестов api/mobile/packages в §12), golden-файлы в scratchpad — `designSystemCss({ theme: 'protocol' })`, `designSystemCss({ theme: 'light', darkTheme: 'dark' })`, словарь `{ key: t(key) }` по всем ключам `@on-bike/i18n` | `pnpm check` зелёный, эталоны сохранены |
| S1 | Реестр: `.npmrc`, `pnpm-workspace.yaml` (catalog `@rkarakulov/*: 0.1.0` точной версией, `minimumReleaseAgeExclude: ['@rkarakulov/*']`), зависимости пакетов/приложений через `catalog:` | `pnpm install` без ошибок; `pnpm why @nestjs/core drizzle-orm react zod` — по одной версии; `pnpm check` зелёный без изменений кода |
| S2 | Пакеты on-bike: `contracts` (+ правило depcruise) → `api-client` (+ `apiErrorOf`, `error-messages.ts` mobile) → `i18n` (без удаления `uiKit.*` — они ещё нужны старой витрине до S4) → `design-tokens` | тесты пакетов; `pnpm typecheck` по всем потребителям; `pnpm arch:check`; golden-CSS побайтно равен; golden-словарь равен (все ключи); тесты mobile/admin/landing зелёные без правок тестов |
| S3 | `apps/api`: env, `db/`, `queues.ts`, `error-messages.ts`, `AppModule`/`WorkerModule`/`main.ts`, импорты модулей, удаление `infra`/`common`/`config.module.ts`/`http-app.ts`; тесты — на test-kit; `drizzle.config.ts` | `pnpm infra:up`; `pnpm --filter @on-bike/api test` (unit + integration) зелёный, включая TRUST_PROXY e2e; `pnpm --filter @on-bike/api db:generate` → «No schema changes», `drizzle/` без диффа; `pnpm --filter @on-bike/api build` и `node dist/main.js` + `node dist/worker.js` стартуют; `curl /v1/health`; регистрация → письмо в Mailpit |
| S4 | `apps/mobile`: jest-конфиг, `theme/design-system.ts`, `fonts.ts`, `_layout.tsx`, импорты экранов/features → `@rkarakulov/ui`, витрина → `UiKit` базы, удаление копий; в `@on-bike/i18n` — удаление `uiKit.*` | `pnpm --filter @on-bike/mobile test`, `typecheck`, `pnpm lint`; `git ls-files apps/mobile/src/components/ui` пуст; `grep -r "@/components/ui\|@/theme/theme\|@/lib/text" apps/mobile/src` пуст; `expo start` → Expo Go Android: splash → Главная, регистрация → Mailpit → подтверждение → вход (AC4, человек) |
| S5 | admin/landing — кода нет, только проверка | `pnpm --filter @on-bike/admin build test`, `pnpm --filter @on-bike/landing build test`; golden-CSS (S2) |
| S6 | CI и документы: `ci.yml`, runbook, AGENTS.md, правила/скилы, architecture README, design.md §4 | `pnpm check` зелёный (вывод в §12); gitleaks; push — только с «да» человека, CI зелёный (AC5) |

### ENTRY POINTS
- `apps/api/src/main.ts`, `apps/api/src/worker.ts` (через `app.module.ts`, `worker.module.ts`).
- `apps/mobile/src/app/_layout.tsx` (первый импорт — `@/theme/design-system`), `apps/mobile/jest.setup.ts`.
- `apps/admin/src/design-system.ts`, `apps/landing/src/layouts/Base.astro` — не меняются, потребители обёртки.
- Пакеты: `packages/{contracts,api-client,i18n,design-tokens}/src/index.ts`.

### FILES TO MODIFY
**Корень / CI**
- `.npmrc` (новый): `@rkarakulov:registry=https://npm.pkg.github.com` и
  `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` — только переменная, без значения.
- `pnpm-workspace.yaml`: в `catalog` — `@rkarakulov/{api-kit,test-kit,contracts-core,api-client-core,i18n-core,design-tokens,ui}: 0.1.0`;
  `minimumReleaseAgeExclude: ['@rkarakulov/*']` (только scope; сверить ключ с документацией pnpm 11 через context7).
- `.dependency-cruiser.cjs:44-49` — `contracts-pure.pathNot` += `@rkarakulov/contracts-core`.
- `.github/workflows/ci.yml` — job `check`: `permissions: { contents: read, packages: read }`; у шага
  `pnpm install --frozen-lockfile` — `env: NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (только у этого шага).
  Job `secrets` (gitleaks) не трогать.
- `eslint.config.mjs` — без изменений (пресет базы — F3); запрет `color` из `@on-bike/design-tokens` остаётся.

**packages/contracts**
- `src/common.ts`: `API_VERSION` остаётся; `export { PageQuery, RateLimitedDetails, Uuid } from '@rkarakulov/contracts-core'`;
  `export const { ErrorCode, ApiError } = defineErrorCodes(['EMAIL_TAKEN', 'EMAIL_UNAVAILABLE', 'LINK_EXPIRED'])`;
  `export const { FieldErrorCode, ValidationErrorDetails, fieldError } = defineFieldErrorCodes(['AGE_BELOW_18', 'CONSENT_REQUIRED'])`;
  типы через `z.infer`. Только явные экспорты: у contracts-core тоже есть `fieldError` (с кодами базы).
- `package.json`: `dependencies` += `@rkarakulov/contracts-core: catalog:`.

**packages/api-client**
- `src/index.ts`: `createApiClient` = `createHttpClient({ baseUrl, getAccessToken, fetchImpl, errorSchema: ApiError })` +
  методы домена (пути и схемы без изменений; `health` через `http.get`); реэкспорт `ApiHttpError`, `ApiNetworkError`,
  `isNetworkError`, `parseApiError` из `@rkarakulov/api-client-core`; `type ParsedApiError = ParsedApiError<ErrorCode>`;
  новая `apiErrorOf(error)` (§8.1 п. 5). Свои классы ошибок и `request` — удалить.
- `package.json`: += `@rkarakulov/api-client-core: catalog:`.

**packages/i18n**
- `src/ru.ts`: удалить 24 ключа, совпадающих с базой (`field.errorPrefix`, `field.datePlaceholder`,
  `field.datePickerDone`, `state.*` ×8, `date.*` ×13) — в S2; все `uiKit.*` — в S4 (§8.1 п. 4).
  `auth.field.*`, `auth.error.*` — остаются (§8.1 п. 3).
- `src/index.ts`: `messages = mergeDictionaries(baseMessages.ru, ru)`; `i18n = createI18n({ baseLocale: 'ru', base: messages })`;
  `t(key: MessageKey, params?)` = `i18n.t`; экспорт `i18n`, `messages`, `Messages`, `MessageKey`, `MessageParams`,
  `interpolate` (реэкспорт базы). Сигнатура `t` для приложений не меняется.
- `package.json`: += `@rkarakulov/i18n-core: catalog:`.

**packages/design-tokens**
- `src/primitives.ts` → только бренд: `color` (палитра), `font`, `fontStack: FontStack` (структурные шкалы — из базы).
- `src/themes.ts`: `ColorRoles = BaseColorRoles & { map: …; surfaceBar: … }`, `themes = defineThemes({ light, dark, protocol })`
  (значения и порядок ключей — без изменений: порядок определяет CSS), `Theme`/`OnBikeTheme = ThemeOf<typeof themes>`,
  `ThemeName`, `NavRoles` (реэкспорт).
- `src/contrast.ts`: `contrastPairs(themeName)` = `contrastPairs` базы + пары `map.route`/`map.corridor` (как сейчас;
  новых пар не добавлять); `contrastRatio`, `WCAG`, `ContrastPair` — реэкспорт.
- `src/css.ts`: `designSystemCss({ theme, darkTheme })` = базовый с `themes`, `fontStack`, `dense: theme === 'protocol'`;
  `typographyCss`, `skeletonCss` — реэкспорт; `cssVariables(themeName)` — обёртка или удалить (вне пакета не
  используется). Копии `flatten`/`kebab`/`luminance` — удалить.
- `src/index.ts`: явные реэкспорты из базы (`density, inset, motion, radius, size, space, stroke, typography,
  fontWeights` и типы) + бренд.
- `package.json`: += `@rkarakulov/design-tokens: catalog:`.

**apps/api**
- `package.json`: += `@rkarakulov/api-kit` (deps), `@rkarakulov/test-kit` (devDeps); `nodemailer`, `@types/nodemailer` —
  убрать, если после удаления `infra/mail` импортов нет.
- `src/config/env.ts`: `defineEnv(...)` (§8.1 п. 10); `ENV` и свой парсер — удалить.
- `src/app.module.ts`: `ConfigModule.forRoot(env)`, `ClockModule`, `DatabaseModule.forRoot({ schema })`, `RedisModule`,
  `OutboxModule`, `QueueModule` из api-kit; providers: `{ provide: APP_FILTER, useClass: ApiExceptionFilter }`,
  `{ provide: API_ERROR_MESSAGES, useValue: ON_BIKE_ERROR_MESSAGES }` (в том же модуле, что и `APP_FILTER`).
- `src/worker.module.ts`: то же + `MailModule`, `OutboxPublisherModule.forRoot({ routes: { ...identityOutboxRoutes } })`.
- `src/main.ts`: `loadEnv()` → `NestFactory.create(AppModule, createFastifyAdapter(env))` →
  `configureHttpApp(app, { prefix: API_VERSION })` → `enableShutdownHooks` → `listen`.
- `src/db/schema.ts` (новый): `export { outbox } from '@rkarakulov/api-kit/outbox-schema'`.
- `src/db/index.ts` (новый): `schema`, типы `Database`, `DbExecutor` с `typeof schema`.
- `src/queues.ts` (новый): `QUEUE` из `infra/queue/queues.ts` без изменений.
- `src/error-messages.ts` (новый): `ON_BIKE_ERROR_MESSAGES` (тексты из `common/api-exception.filter.ts:21-23`),
  опционально `domainError()` (§8.1 п. 14).
- `drizzle.config.ts`: `schema: ['./src/db/schema.ts', './src/modules/*/*.schema.ts']`.
- `src/modules/health/{health.service,health.controller.test}.ts` — `PG_POOL` из api-kit.
- `src/modules/identity/{auth.controller,identity.events,identity.module,identity.repository,registration.service,
  session.service,verification.service}.ts`, `jobs/{cleanup-unverified.processor,identity-schedules,
  verification-email.processor}.ts`, `mail/verification-email.ts` — импорты: `DomainError`, `ZodValidationPipe`
  (+ `FieldErrorCode` во всех 4 местах), `CLOCK`/`Clock`, `ENV`, `MAILER`/`MailMessage`, `OutboxWriter`/`OutboxReader`/
  `OutboxJobData`, `RateLimiter`, `isUniqueViolation`, `DB` — из api-kit; `Database`/`DbExecutor` — из `src/db`;
  `QUEUE` — из `src/queues`. Логика — без изменений.
- `src/modules/tracks/{tracks.module,track-processing.processor}.ts` — `QUEUE`.
- `test/harness.ts`: обёртка `createHarness(overrides)` → `createApiHarness({ apiModule: AppModule, workerModule:
  WorkerModule, env: testEnv(overrides), httpPrefix: API_VERSION, schema })`; `type Harness = ApiHarness<Env, typeof schema>`;
  реэкспорт `DAY`, `HOUR`, `MINUTE`, `waitForLockWaiter`, `TestClock`, `FakeMailer` из test-kit (импорты тестов не меняются).
- `test/global-setup.ts`: `recreateTestDatabase({ url: DATABASE_URL_TEST, migrationsFolder: resolve(__dirname, '../drizzle') })`.
- `test/db.ts`: `createTestDb()` со схемой on-bike; `truncateAll` — реэкспорт test-kit (чистит все таблицы `public`,
  кроме таблиц расширений — PostGIS `spatial_ref_sys` не трогается).
- `test/test-env.ts`: `env.load({...})` вместо `loadEnv(...)` (с явным источником `.env` не читается — как сейчас).
- `test/identity.ts` — тип `Harness` из обёртки (без изменений логики).

**apps/mobile**
- `package.json`: += `@rkarakulov/ui: catalog:`.
- `jest.config.js`: `transformIgnorePatterns` — три записи пресета jest-expo 58, в первой `|@rkarakulov` (§7);
  `customExportConditions` не менять.
- `jest.setup.ts`: первым — `import './src/theme/design-system'` (бренд, шрифты и i18n on-bike — тесты экранов
  проверяют настоящие `PlayfairDisplay_500Medium`/`Inter_*` и цвета тем); мок datetimepicker остаётся.
- `src/theme/design-system.ts` (новый): `configureDesignSystem({ themes, fonts: fontFamilies, i18n })`.
- `src/theme/fonts.ts`: остаются `fontAssets` и `fontFamilies: FontFamilies` (тип из `@rkarakulov/ui`);
  `fontFamilyFor`/`textStyle` — удалить (база).
- `src/app/_layout.tsx`: первый импорт `@/theme/design-system`; `useTheme` из `@rkarakulov/ui`.
  Правило: `textStyle`/`useTheme`/`formatCalendarDate` — только при рендере, не на уровне модуля (база бросает ошибку).
- `src/app/ui-kit.tsx`: `<SafeAreaView>` + `<UiKit photo={photo} />` из `@rkarakulov/ui` (обёртку экрана даёт проект).
- Импорты `@/components/ui`, `@/components/async-content`, `@/theme/theme`, `@/theme/fonts` (`textStyle`),
  `@/lib/text` → `@rkarakulov/ui`: `app/(onboarding)/{_layout,check-email,register,sign-in}.tsx`,
  `app/(tabs)/{_layout,index}.tsx`, `app/auth/verify/[token].tsx`, `components/{screen-placeholder,tab-bar}.tsx`,
  `features/auth/{auth-screen,verification-states}.tsx`, `__tests__/{check-email,verify-link}.test.tsx`.
- `src/features/auth/error-messages.ts` — `apiErrorOf` (§8.1 п. 5), ключи `auth.*` без изменений.
- `src/__tests__/ui-kit.test.tsx` — «Класс велосипеда» → «Категория» (если §8.1 п. 4 = A).

**Документы** (дополняют §10): `AGENTS.md` §2 и §4.11 (§8.1 п. 1); `.claude/rules/{backend,db,security,mobile,web}.md`;
`.claude/skills/{backend-nest,mobile-expo,web-ui}/SKILL.md` (пути); `docs/architecture/README.md:52-77` (outbox — api-kit,
дизайн-система — база + бренд); `docs/runbooks/local-dev.md` (токен: `gh auth refresh -s read:packages`,
`export NODE_AUTH_TOKEN=$(gh auth token)`; EAS secret); design.md §4.

### FILES TO DELETE
- `apps/api/src/infra/**` (18 файлов), `apps/api/src/common/**` (5), `apps/api/src/config/config.module.ts`,
  `apps/api/src/http-app.ts`.
- `apps/mobile/src/components/ui/**` (20), `apps/mobile/src/components/{async-content,async-content.test,ui-kit}.tsx`,
  `apps/mobile/src/theme/{theme,motion,theme.test}.ts`, `apps/mobile/src/lib/{calendar-date,calendar-date.test,text,text.test}.ts`.
- `packages/design-tokens/src/typography.ts`.

### FILES TO READ
- База: `packages/api-kit/src/{index,config/env,errors/*,database/*,http/http-app,outbox/outbox.module}.ts`,
  `packages/test-kit/src/{harness,db}.ts`, `packages/ui/src/{index,config}.ts`, `packages/ui/jest.setup.ts`,
  `packages/ui/src/components/ui-kit.tsx`, `packages/design-tokens/src/{themes,css,contrast}.ts`,
  `packages/i18n-core/src/{i18n,messages/ru}.ts`, `packages/contracts-core/src/errors.ts`,
  `packages/api-client-core/src/index.ts`, `README.md` («Подключение пакетов»), `smoke/jest/ui.test.tsx`.
- on-bike: файлы из FILES TO MODIFY/DELETE (сравнить 1 в 1 перед удалением), `node_modules/jest-expo/jest-preset.js:130-150`,
  `.dependency-cruiser.cjs`.

### TYPES & SCHEMAS
- Контракты API — без изменений: состав и порядок `ErrorCode`/`FieldErrorCode` прежние (база первой, коды on-bike
  после), форма `ApiError`/`ValidationErrorDetails`/`RateLimitedDetails` та же → установленные клиенты не затронуты.
- `Env` = `ReturnType<typeof env.load>`; `Database`/`DbExecutor` — дженерики api-kit с `typeof schema`;
  `Harness = ApiHarness<Env, typeof schema>`; `OnBikeTheme = ThemeOf<typeof themes>` (группы `map`, `surfaceBar` —
  через `useTheme<OnBikeTheme>()`, сейчас вне пакета не используются); `FontFamilies` из `@rkarakulov/ui`;
  `MessageKey = keyof Messages & string`; `ParsedApiError<ErrorCode>`.
- Миграции — нет. Очереди и `jobId = id события outbox` — без изменений.

### TESTS
**Удаляются как дубли тестов базы** (перечислить в §12 с числами):
- api: `common/api-exception.filter.test.ts` (4), `common/zod-validation.pipe.test.ts` (3), `infra/mail/mailer.test.ts` (1),
  `infra/outbox/outbox.publisher.int.test.ts` (4), `infra/redis/rate-limiter.int.test.ts` (5); в `config/env.test.ts` —
  кейс TRUST_PROXY (1, есть в `api-kit/src/config/env.test.ts`).
- mobile: `components/async-content.test.tsx` (8), `components/ui/{date-field,skeleton,ui}.test.tsx` (8+6+26),
  `lib/{calendar-date,text}.test.ts` (3+1), `theme/theme.test.ts` (6, заменяется — см. ниже).
- packages: `design-tokens.test.ts` — кейсы только базы (`contrastRatio` чёрный/белый, пороги WCAG, типографика,
  формат `.t-*`, скелетон); `i18n/index.test.ts` — `interpolate`; `api-client/index.test.ts` — классы ошибок
  (сеть/HTTP/форма ответа) — покрыты `api-client-core`.
**Остаются без изменений логики** (сторожа поведения): api — все `modules/identity/**`, `modules/health/**`,
`http-app.int.test.ts` (TRUST_PROXY e2e: подмена левого XFF не обходит лимит; можно переименовать в
`trust-proxy.int.test.ts`), `config/env.test.ts` (APP_LINK_BASE, секреты); mobile — все `__tests__/*`
(тексты экранов, гард, splash/шрифты, вкладки с `PlayfairDisplay_500Medium`/`Inter_*` и цветами тем), `features/auth/*`,
`lib/{countdown,query-client}`; contracts — все; api-client — `auth.test.ts`.
**Меняются / новые:**
- api: `registration.int.test.ts:117` и `verification.int.test.ts:103` — точные тексты
  («E-mail недоступен для регистрации», «Ссылка устарела»); новый unit `src/error-messages.test.ts`: каждый код
  `ErrorCode.options` вне `BASE_ERROR_CODES` имеет текст.
- api-client: в `auth.test.ts` кейс «известный код» — на коде on-bike (`LINK_EXPIRED` с `details.email`): доказывает,
  что `errorSchema: ApiError` передан; кейс `apiErrorOf` для ошибки, созданной без схемы.
- design-tokens: остаются бренд-тесты — соответствие CSS прототипов (light/dark), `protocol` = light + nav, контраст всех
  тем on-bike с парами `map`, обёртка CSS (плотность только у `protocol`, тёмная через `prefers-color-scheme`,
  `--color-map-*` в CSS).
- i18n: `t('tabs.home')`; строка базы доступна (`t('state.retry') === 'Повторить'`); сторож дублей — ни один ключ
  словаря on-bike не повторяет ключ базы с тем же текстом.
- mobile: `theme/fonts.test.ts` — каждый `typography`-стиль даёт семейство из `fontAssets`; display 500 →
  `PlayfairDisplay_500Medium`. `__tests__/ui-kit.test.tsx` — одна строка (§8.1 п. 4).
**Разовая сверка** (не тест, вывод в §12): golden-CSS admin/landing и golden-словарь S0 = после S2/S4 (кроме удалённых
`uiKit.*`); `db:generate` — «No schema changes»; смоук Android (AC4).

### OUT OF SCOPE
- Шаблон copier, `.copier-answers.yml`, плагин `app-dev-kit` и адаптеры Codex (F3); `@on-bike/config` и ESLint-пресет
  базы (F3, §8.1 п. 12); Renovate; `foundation:link`.
- Перевод `auth.field.*`/`auth.error.*` на ключи базы (F6, §8.1 п. 3); identity, tracks, тексты экранов.
- Правки пакетов базы (README jest, слот `UiKit`, хелперы jest-expo) — задачи в app-foundation (§8.1 п. 6, 13).
- Web-варианты (`.web`), universal-app (F5); EAS-секрет — действие человека.

## 12. Outcome
Заполняет coder.

### S0–S2

**S0 — эталоны.** `pnpm check` до изменений — зелёный. Тесты: api 74 (19 файлов), mobile 130 (19 наборов),
design-tokens 117, contracts 19, api-client 10, admin 6, i18n 2, tracks 2, landing 0. Golden-файлы (вне git,
scratchpad сессии): `f4-golden/{admin.css,landing.css,dictionary.json}` — `designSystemCss({ theme: 'protocol' })`,
`designSystemCss({ theme: 'light', darkTheme: 'dark' })`, `{ key: t(key) }` по 136 ключам.

**S1 — зависимости** (коммит «F4 S1»). Catalog `@rkarakulov/{api-kit,test-kit,contracts-core,api-client-core,
i18n-core,design-tokens,ui}: 0.1.0`; contracts → contracts-core, api-client → api-client-core, i18n → i18n-core,
design-tokens → design-tokens базы, api → api-kit (+ test-kit в devDependencies), mobile → ui. `.npmrc` и
`minimumReleaseAgeExclude` — уже были (коммиты d9add62, 173b528). `pnpm why`: `@nestjs/core` 12.2.0,
`drizzle-orm` 0.45.4, `react` 19.3.0, `zod` 4.6.7 (+ 3.25.76 — собственная вложенная зависимость `@expo/cli`,
была и до F4, пакеты базы и приложения её не видят). `pnpm check` зелёный без изменений кода.

**S2 — пакеты on-bike** (коммит «F4 S2»).
- contracts: `common.ts` на `defineErrorCodes`/`defineFieldErrorCodes`, `PageQuery`/`Uuid`/`RateLimitedDetails` —
  реэкспорт contracts-core; depcruise `contracts-pure` пропускает `@rkarakulov/contracts-core`.
- api-client: `createHttpClient` базы с `errorSchema: ApiError`; `ApiHttpError`/`ApiNetworkError`/`isNetworkError`/
  `parseApiError` — реэкспорт; `apiErrorOf(error)` (§8.1 п. 5); `apps/mobile/src/features/auth/error-messages.ts` — на
  `apiErrorOf`.
- i18n: `messages = mergeDictionaries(baseMessages.ru, ru)`, `i18n = createI18n(...)`, `t` = `i18n.t`; из словаря
  удалены 24 ключа базы (`field.errorPrefix|datePlaceholder|datePickerDone`, `state.*` ×8, `date.*` ×13); `uiKit.*`
  остаются до S4. Экспорт `ru` убран (вне пакета не использовался).
- design-tokens: бренд (`color`, `font`, `fontStack`), `themes = defineThemes(...)`, `ColorRoles = база & { map,
  surfaceBar }`, `OnBikeTheme = ThemeOf<typeof themes>`, `Theme = Theme<OnBikeRoleGroups>` базы (с `nav?`, как было);
  `contrastPairs(themeName)` = пары базы + `map.route`/`map.corridor`; `designSystemCss({ theme, darkTheme })` —
  базовый с брендом и `dense: theme === 'protocol'`; `typography.ts` удалён, `cssVariables` убран из API пакета.
- apps/mobile/jest.config.js: `transformIgnorePatterns` — три записи пресета jest-expo 58 + `@rkarakulov` (§7, §8.1
  п. 6). Сделано в S2, а не в S4: без него все 19 наборов mobile падают («Must use import to load ES Module»).

Сверка: golden-CSS admin и landing — побайтно равны (`cmp`); golden-словарь — равен по всем 136 ключам.
`pnpm check` — зелёный (`no dependency violations found (210 modules, 492 dependencies cruised)`, 14/14 задач).
Тесты после S2: api 74, mobile 130, admin 6 (тесты приложений не менялись), design-tokens 114, contracts 21,
api-client 11, i18n 5, tracks 2. Сборка пакетов и admin/landing (`turbo run build`) — зелёная.

Тесты пакетов, удалённые как дубли тестов базы: design-tokens −5 (`contrastRatio` чёрный/белый, пороги WCAG,
типографика, формат `.t-*`, скелетон), +2 (пары карты в наборе, пары `nav.*` только у protocol); i18n −1
(`interpolate`), +4 (строки базы через `t`, плейсхолдеры, сторож дублей, слияние словарей); api-client −2 (форма
2xx; сеть и HTTP объединены в один тест-сторож реэкспорта классов базы), +3 (`apiErrorOf`), кейс «известный код» —
на `LINK_EXPIRED` с `details.email`; contracts +2 (состав и порядок кодов, `fieldError` с кодами on-bike).

Отклонения: (1) jest-конфиг mobile — в S2 (см. выше); (2) в api-client оставлен один тест классов ошибок (сторож
того, что клиент бросает реэкспортированные классы — на этом стоит `apiErrorOf`); (3) сторож дублей i18n временно
пропускает `uiKit.*` — фильтр снять в S4 вместе с ключами.

Наблюдения: на холодном кэше jest (`--no-cache`) 2 теста mobile (`skeleton.test.tsx`, `async-content.test.tsx`)
падают по таймауту 5 с — так же и до F4 (проверено на коммите S1); оба файла удаляются в S4 (дубли базы).
`@types/nodemailer` нужен api и после S3: `.d.ts` api-kit импортируют типы `nodemailer`, а api-kit не объявляет
`@types/nodemailer` (пробел базы); удаление `nodemailer` из `apps/api/package.json` в S3 потребует обновить lockfile.

### S4–S5 (коммит 23ff9a5)

**S4 — mobile на `@rkarakulov/ui`.** `src/theme/design-system.ts` — `configureDesignSystem({ themes, fonts: fontFamilies, i18n })`
с брендом on-bike, первый импорт в `src/app/_layout.tsx` и `jest.setup.ts`; в `fonts.ts` — `fontAssets` и `fontFamilies`.
Импорты экранов, features и тестов → `@rkarakulov/ui`; витрина `/ui-kit` = `SafeAreaView` + `UiKit` базы (`photo`).
Удалены копии: `components/ui/**` (20 файлов), `components/{async-content,async-content.test,ui-kit}.tsx`,
`theme/{theme,motion,theme.test}.ts`, `lib/{calendar-date,text}(+test).ts` — перед удалением сверены с базой
(отличия: импорты, `useT()`, комментарии; `DateField` отдаёт iOS-пикеру `locale` из `useLocale()` — `ru` вместо `ru-RU`).
`useTheme<OnBikeTheme>()` не понадобился: `map`/`surfaceBar` в mobile не используются. В `@on-bike/i18n` удалены 42 ключа
`uiKit.*` (§8.2 п. 2), сторож дублей без фильтра.
Тесты mobile: 74 (13 наборов) = 130 − 58 дублей базы (`async-content` 8, `date-field` 8, `skeleton` 6, `ui` 26,
`calendar-date` 3, `text` 1, `theme` 6) + 2 новых (`theme/fonts.test.ts`: семейства бренда через `textStyle` базы);
`--no-cache` — 74/74 (таймауты S2 ушли вместе с дублями). i18n 5. typecheck, eslint, prettier, `arch:check` — зелёные;
grep `@/components/ui|@/theme/theme|@/lib/text` пуст. `expo export --platform android` — бандл (1571 модуль) без ошибок
резолва `@rkarakulov/*`. Golden-словарь: 111 ключей вне `uiKit.*` равны S0; из 25 `uiKit.*` 9 удалены, 16 — тексты базы.

**S5 — admin и landing** (без кода): build/test/typecheck — зелёные (admin 6 тестов, landing 0); golden-CSS admin
(`protocol`) и landing (`light` + `dark`) побайтно равны S0.

NOT VERIFIED: AC4 — смоук на Android в Expo Go (человек); iOS-пикер с `locale="ru"`.
Пробелы базы (follow-up app-foundation): `t()` с отсутствующим ключом бросает «требует числовой params.count» вместо
явной ошибки; `UiKit` без слота для компонентов проекта.
