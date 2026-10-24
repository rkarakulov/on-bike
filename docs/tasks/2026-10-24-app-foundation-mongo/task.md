# MongoDB как опция шаблона app-foundation (`database: postgres | mongo`)

## 1. Title
База app-foundation: выбор БД при `copier copy` — `postgres` (по умолчанию, как сейчас) или `mongo`; пакеты
`@rkarakulov/api-kit` и `@rkarakulov/test-kit` получают Mongo-часть, не затрагивая PostgreSQL-проекты.

## 2. Goal
Новый проект на базе можно создать на MongoDB с теми же гарантиями, что у PostgreSQL-варианта: env с валидацией на
старте, транзакции, transactional outbox → BullMQ, миграции отдельным шагом деплоя, health-check, стенд тестов на
реальной БД, CI и `template:check`. PostgreSQL-проекты (on-bike) не меняются: рендер `postgres` побайтно прежний,
Mongo-зависимости к ним не приходят. Решение автора 2026-10-24.

## 3. Scope
- **Вопрос copier** `database` (`postgres` | `mongo`, по умолчанию `postgres`); `use_postgis` — только при `postgres`
  (`when` + validator).
- **`@rkarakulov/api-kit`:** DB-нейтральный вход `./core`; Mongo-вход `./mongo` (env `MONGO_URL`, `MongoModule`,
  транзакции, `isDuplicateKey`, `uuidv7`, outbox на коллекции, мигратор); `pg`/`drizzle-orm` — необязательные peer,
  `mongodb` — необязательный peer. Корневой вход `.` — без изменений API (PostgreSQL).
- **`@rkarakulov/test-kit`:** `./core` (DB-нейтральное), `./mongo` (стенд `createMongoApiHarness`, guard-ы, пересоздание
  тестовой БД с миграциями, очистка коллекций). Корневой вход — без изменений API.
- **Шаблон:** Mongo-вариант `apps/api` (env, модули, миграции, health, тесты стенда), `infra/docker-compose.dev.yml`
  (single-node replica set), CI проекта, правила/AGENTS/ADR/runbook/README рендера; PostgreSQL-рендер не меняется.
- **Проверки базы:** `infra/docker-compose.test.yml` и CI `check` — MongoDB replica set; `template:check` для
  `database=mongo`; матрица CI `template`, `template-update`, `template-release-check` — нога `mongo`; смоук `/core`,
  `/mongo` из `dist` + сторож «`/core` и `/mongo` не грузят `pg`/`drizzle-orm`».
- **Процесс:** тексты плагина `app-dev-kit` (`backend-nest`, `architect`, README) — без привязки к Drizzle/PostgreSQL
  (читать БД проекта из `AGENTS.md`/`db.md`), версия плагина, `pnpm template:sync`.
- **Релиз:** minor `0.4.0` (пакеты) → шаблон с опцией `mongo` — следующим релизом `0.4.1` (D7).

## 4. Out of Scope
- on-bike: никаких изменений кода/инфраструктуры (остаётся PostgreSQL 18 + PostGIS). Опционально после релиза —
  `copier update` on-bike до `0.4.x` (ожидаемо без изменений, кроме версии) — отдельной задачей on-bike.
- Смена БД у существующего проекта через `copier update` (ответ `database` фиксируется при создании).
- Mongoose/ODM, Prisma, change streams, шардирование, Atlas Search, геозапросы Mongo (`2dsphere`) — аналога
  `use_postgis` нет.
- `$jsonSchema`-валидаторы коллекций, генерация схем из zod, CSFLE/Queryable Encryption.
- Identity (F6) для Mongo: решение — в F6 (см. §8.1, S1).
- Аутентификация MongoDB в dev/CI (keyFile, пользователи) — dev и CI без auth на `127.0.0.1`; прод — runbook.
- Пер-воркерная изоляция тестовых БД (`VITEST_POOL_ID`): файлы интеграции идут по очереди, как у PostgreSQL.

## 5. Architecture Context
Источники проверены по `origin/main` базы (`a2d7134`, пакеты `0.3.0`) и прототипом (см. §8.1, «Факты»):
- `packages/api-kit/src/index.ts` — один вход: реэкспорт `DatabaseModule` (`drizzle-orm/node-postgres`, `pg` — импорт
  на уровне модуля), outbox на drizzle; `baseEnvShape` требует `DATABASE_URL: z.url()`; `peerDependencies` `pg`,
  `drizzle-orm` — обязательные. Модули `config`, `clock`, `errors`, `http`, `mail`, `queue`, `redis` от `pg`/drizzle
  не зависят (проверено по импортам) — DB-нейтральный вход выделяется без переписывания.
- `OutboxPublisher` — `FOR UPDATE SKIP LOCKED` + `jobId = id события`; `OutboxPublisherLoop` типизирован конкретным
  `OutboxPublisher`, но использует только `publishBatch(limit)`.
- `packages/test-kit/src/{db,harness}.ts` — `pg`, drizzle-мигратор, `truncateAll`, `waitForLockWaiter`; `harness.ts`
  импортирует корень `@rkarakulov/api-kit`. Guard-ы: `testDatabaseName` (`*_test`), `testRedisDb` (БД ≥ 1).
- Шаблон `apps/api`: PG-зависимое — `drizzle/**`, `drizzle.config.ts.jinja`, `src/db/{index,schema}.ts`,
  `src/{app,worker}.module.ts`, `modules/health/*`, `test/{db,global-setup,harness*,test-env}`, `package.json.jinja`,
  `.env.example.jinja`, `tsconfig.json.jinja`, `vitest.config.mts.jinja`; плюс `infra/docker-compose.dev.yml.jinja`,
  `.github/workflows/ci.yml.jinja`, `turbo.json`, `pnpm-workspace.yaml.jinja`, `eslint.config.mjs`, документы
  (`AGENTS.md.jinja`, `.claude/rules/{db,backend}.md.jinja`, `docs/adr/0001-stack.md`, `docs/runbooks/local-dev.md.jinja`,
  `README.md.jinja`, `CLAUDE.md`).
- Порядок «пакеты → шаблон»: `template:check` в PR ставит **последние опубликованные** `@rkarakulov/*`
  (README базы: «шаблон, которому нужна ещё не выпущенная функция пакета, — отдельным PR после релиза»).
- Пример требований — on-bike identity (`apps/api/src/modules/identity/identity.repository.ts`): условный UPDATE
  ротации refresh c условием по другой таблице (`EXISTS users.deleted_at`), lease-захват отправки письма, `uuidv7()`,
  outbox в транзакции, уникальность. Mongo-вариант даёт для этого примитивы и правила (§8.1 F6–F8), не домен.

## 5.1 Placement & Reuse Gate
| Что | Где | Почему |
|---|---|---|
| DB-нейтральная инфраструктура API | `@rkarakulov/api-kit/core` (новый subpath) | без `pg`/drizzle; корень `.` реэкспортирует то же — PG-проекты не меняются |
| Mongo: env, клиент, транзакции, ошибки, outbox, мигратор, `uuidv7` | `@rkarakulov/api-kit/mongo` | рядом с PG-аналогами; переиспользует `Clock`, `OutboxRoutes`, `OutboxJobData`, `OutboxPublisherLoop`, `QueueModule`; `mongodb` — необязательный peer |
| Стенд тестов Mongo | `@rkarakulov/test-kit/mongo` (+ `./core`) | общее ядро стенда (Nest-графы, часы, почта, Redis) — один внутренний модуль для PG и Mongo, не копия |
| Композиция Mongo-проекта | шаблон `template/apps/api/**` (ветки Jinja и условные `_exclude`) | проектное — в шаблоне |
| Правила работы с MongoDB | `template/.claude/rules/db.md.jinja` (ветка `mongo`) | правила зоны — у проекта |

Отклонено: новый пакет `@rkarakulov/mongo-kit` (D2). Запрещённые дубли: своя `ConfigModule`/`QueueModule`/
`RedisModule`/`ApiExceptionFilter` в Mongo-части; копия `harness.ts` под Mongo; свой цикл публикатора вместо
`OutboxPublisherLoop`; `Uuid`-схема в контрактах проекта (есть `Uuid` в `@rkarakulov/contracts-core`).
Контракты (`contracts-core`, `packages/contracts` шаблона) **не меняются**: `HealthResponse.checks.database` тот же,
id — `Uuid` (`z.uuid()`) в обоих вариантах.

## 6. Relevant Files
app-foundation: `copier.yml`, `packages/api-kit/**`, `packages/test-kit/**`, `smoke/**`, `scripts/{check-template,
smoke-consumer}.mjs`, `infra/docker-compose.test.yml`, `.github/workflows/{ci,release}.yml`, `pnpm-workspace.yaml`,
`template/**` (см. §11), `plugin/{README.md,agents/architect.md,skills/backend-nest/SKILL.md,.claude-plugin/plugin.json}`,
`README.md`, `AGENTS.md`. on-bike: только этот task.md и строка в `docs/tasks/2026-10-22-app-foundation/design.md`.

## 7. Implementation Notes
- Mongo-код api-kit/test-kit импортирует `mongodb` только из файлов под `src/mongo/**`; `src/core.ts` и `src/mongo/**`
  не импортируют `database/`, `outbox/outbox.{schema,publisher,reader,writer}.ts` и корень пакета.
- Документы в БД типизируются TS-интерфейсами (`Collection<XDoc>`), вход/выход API — zod-контракты; чтение из БД
  zod-ом не валидируется (без второго источника схемы).
- Все тексты ошибок/логов — без значения `MONGO_URL` и без `keyValue` ошибок дубликата (там персональные данные).

## 8. Risks / Assumptions / Open Questions
- Нужен **replica set** везде (транзакции и outbox): standalone `mongod` не поддерживается — fail-fast на старте (D5).
- CI GitHub Actions: `services` не принимают `command` → MongoDB запускается шагом `docker run … --replSet rs0` +
  `rs.initiate` (D5). Условный service в матрице через пустой `image` — проверить по docs GitHub Actions; не
  подтвердится — отдельный job `template-mongo`.
- `mongodb` (CJS) из ESM-`dist` api-kit и из CJS-сборки Nest (`require(esm)`) — стережёт смоук `import.mjs` и шаг
  «api dist loads» рендера.
- Каждая будущая DB-зависимая функция базы (F6 identity) будет стоить двух реализаций — §8.1 S1.
- Образ: `mongo:8.0` (8.0.34, major-релиз с длинной поддержкой; на hub есть `8.2`, `8.3`) — Q1.

## 8.1 Requirements Consistency
Architecture Review — app-foundation-mongo. **Status: CONCERNS** (блокеров нет; решения D1–D9 — рекомендации
architect, утверждает оркестратор; D7 меняет ожидание «всё в 0.4.0»).
Проверено прототипом 2026-10-24: `mongo:8.0` (8.0.34) `--replSet rs0`, драйвер `mongodb@7.7.0`, `zod@4`, copier 9.19.1
(мини-шаблон), исходники copier `_main.py`; версии — `npm view`.

**Факты (не гипотезы):**
- **F1. Корень api-kit тянет `pg` и drizzle** при любом импорте (`index.ts` → `database.module.ts`, `outbox/*`), peer
  обязательные → Mongo-проект без `pg` падает `ERR_MODULE_NOT_FOUND`, с авто-установкой peer pnpm — получает `pg` и
  drizzle «в нагрузку». То же у test-kit. Нужен DB-нейтральный вход (D2).
- **F2. `z.url()` отвергает multi-host URL** `mongodb://h1:27017,h2:27017/app?replicaSet=rs0` (WHATWG URL: порт
  `27017,h2:27017`); `mongodb+srv://…` и single-host проходят. Нужен свой валидатор `MONGO_URL`.
- **F3. Без имени БД в URL драйвер молча берёт `test`** (`client.db()` → `test`). Имя БД в пути `MONGO_URL` обязательно.
- **F4. Single-node RS из docker:** URL без `directConnection=true` (и с `replicaSet=rs0`) → `MongoServerSelectionError`:
  драйвер открывает член набора по адресу из конфигурации RS (`127.0.0.1:27017` внутри контейнера), а не по
  проброшенному порту. С `directConnection=true` — транзакции работают. Healthcheck
  `try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] }).ok }`
  поднимает PRIMARY за ~5 с.
- **F5. Драйвер 7.x:** `session.withTransaction(fn)` возвращает результат `fn`; `findOneAndUpdate` возвращает документ
  или `null` (не `ModifyResult`); `insertOne` в несуществующую коллекцию внутри транзакции — работает; откат —
  данные и outbox не видны.
- **F6. Атомарная ротация** `findOneAndUpdate({ refreshTokenHash: old, revokedAt: null, expiresAt: { $gt: now } },
  { $set: { refreshTokenHash: next } })` — из двух параллельных проходит ровно одна (второй — `null`).
- **F7. Write skew при snapshot isolation:** транзакция A читает `users.u1` и пишет `sessions.s2`, транзакция B пишет
  `users.u1` — **обе коммитятся** без конфликта. Аналог on-bike «`UPDATE … WHERE EXISTS (users.deleted_at IS NULL)`»
  в Mongo не атомарен без записи в документ-условие (правило D8).
- **F8. TTL-индекс удаляет асинхронно** (документ с `expiresAt = now` исчез в течение ~60 с) — TTL только уборка;
  истечение проверяет сервер по `Clock`.
- **F9. Дубликат ключа:** `MongoServerError` `code 11000`, `keyPattern`, `keyValue` (значение — например e-mail),
  имя индекса **только в `errmsg`** (`… index: users_email_uq dup key: …`); `errorResponse.index` — номер операции в
  пачке, не индекс. `createIndex` того же индекса — идемпотентен; с изменёнными опциями — `IndexOptionsConflict`
  (85). Частичный индекс `partialFilterExpression: { publishedAt: { $eq: null } }` создаётся и выбирается планом
  для `find({ publishedAt: null })` (`{ publishedAt: null }` без `$eq` — то же определение, конфликт имён).
- **F10. Операторная инъекция реальна:** фильтр `{ refreshTokenHash: { $ne: null } }` (объект из запроса) совпал со
  всеми документами.
- **F11. Copier 9.19.1:** элементы `_exclude` рендерятся Jinja (`match_exclude` → `_render_string`), пустая строка —
  не шаблон исключения (pathspec игнорирует пустые строки) — условное исключение каталогов работает (проверено
  рендером). Вопрос с `when: false` берёт default, **но `--data use_postgis=true` при `database=mongo` проходит** —
  нужен validator (проверено: validator срабатывает и на `--data`).
- **F12. Релизный порядок:** `template:check` PR рендерит шаблон с последними опубликованными пакетами (0.3.0) —
  Mongo-рендер с импортом `@rkarakulov/api-kit/mongo` в PR пакетов не проверяем.

**Решения (рекомендации; альтернативы — в скобках):**
- **D1. Драйвер — официальный `mongodb@^7.7.0`** (Node ≥ 20.19, типы встроены, `bson` 7; релиз 2026-09-28, проходит
  `minimumReleaseAge`). Документы — TS-интерфейсы, API — zod-контракты (contracts-first без второй схемы).
  Альтернативы: **Mongoose 9.11.4** (оборачивает `mongodb ~7.7`; вторая схема рядом с zod — конфликт с contracts-first,
  middleware/magic, релизы еженедельно, `@nestjs/mongoose` — ещё зависимость; плюс — `sanitizeFilter`) — отклонено;
  **Typegoose 13.5** (peer `mongoose ~9.9.5`, отстаёт) и **Prisma Mongo** (нет миграций для Mongo, движок/кодоген) —
  отклонены.
- **D2. Код — subpath-ы существующих пакетов, не новый пакет.** `@rkarakulov/api-kit`: `.` (как сейчас, PG),
  `./core` (DB-нейтральное), `./mongo`, `./outbox-schema` (как сейчас); `@rkarakulov/test-kit`: `.`, `./core`, `./mongo`.
  `peerDependenciesMeta`: `pg`, `drizzle-orm`, `mongodb` (+ `@types/pg` не в peer) — `optional: true` (pnpm не ставит
  необязательные peer автоматически → PG-проекты не получают `mongodb`, Mongo — `pg`). Корень реэкспортирует
  `./core` — API PG-проектов не меняется (не breaking). Альтернативы: **`@rkarakulov/mongo-kit` (+`mongo-test-kit`)**
  — чистая граница, но 9-й/10-й пакет: «Manage Actions access» в каждом проекте, публикация первого релиза, а
  DB-нейтральное ядро всё равно нужно выделить из api-kit (F1) — отклонено; **сделать корень DB-нейтральным, PG —
  в `./postgres`** — ломающее для on-bike (major + миграция импортов) — отклонено.
- **D3. env.** `./core`: `coreEnvShape` (`NODE_ENV`, `PORT`, `REDIS_URL`, `TRUST_PROXY`), `type CoreEnv`,
  `defineCoreEnv(extra)`; корень: `baseEnvShape = { ...coreEnvShape, DATABASE_URL }`, `defineEnv` — без изменений
  поведения. `ConfigModule.forRoot`, `QueueModule`, `RedisModule`, `createFastifyAdapter`, `EnvDefinition` — ограничение
  `CoreEnv` вместо `BaseEnv` (расширение, не breaking). `./mongo`: `mongoEnvShape = { MONGO_URL }`, валидатор
  `mongoUrl`: схема `mongodb://`/`mongodb+srv://`, обязательное имя БД в пути (F3), допустимые символы имени, без
  `new URL` (F2); сообщение ошибки — без значения. Имя `MONGO_URL` (не `DATABASE_URL` со схемой `mongodb`): явно,
  не путается с PG в runbook/CI. Альтернатива `DATABASE_URL` для обеих БД — меньше веток Jinja, но `z.url()` и
  смысл переменной расходятся — отклонено.
- **D4. Миграции и индексы — свой мигратор в `./mongo`, отдельный шаг деплоя `db:migrate`.**
  `runMongoMigrations({ db, migrations, clock? })`: `MongoMigration = { id: '0001_outbox', up(db): Promise<void> }`;
  список — массив в `src/db/migrations/index.ts`; учёт — коллекция `_migrations` (`{ _id: id, appliedAt }`); блокировка —
  документ `{ _id: 'lock' }` в `_migrations_lock` (уникальный `_id`; занят → ошибка «миграция уже идёт»; снять — runbook);
  применённый id, которого нет в списке, или нарушение порядка → ошибка; упавшая миграция не записывается, lock
  снимается. Миграции идемпотентны (`createCollection` если нет, `createIndex` — F9), без транзакции (DDL на
  непустых коллекциях в транзакции запрещён). Шаблон: `db:migrate` = `tsx src/db/migrate.ts` (dev/CI; `tsx` уже в
  каталоге шаблона), прод — `node dist/db/migrate.js` (runbook). Альтернативы: **ensure-indexes при старте** —
  противоречит инварианту «миграции — отдельный шаг», `IndexOptionsConflict` (F9) уронит старт, долгие сборки индексов
  — отклонено; **migrate-mongo 14.0.7** — последний релиз 2025-12-03, конфиг и миграции на JS, ещё CLI-зависимость —
  отклонено.
- **D5. Транзакции и replica set.** `MongoModule.forRoot()` (global): `MONGO_CLIENT` (`MongoClient`, `maxPoolSize: 10`
  как у пула PG, `serverSelectionTimeoutMS: 5_000` — health не висит 30 с), `MONGO_DB` (`client.db()` из имени в URL),
  `onApplicationBootstrap` — `hello`: нет `setName` и не `mongos` → ошибка старта «нужен replica set» (транзакции
  иначе падают в рантайме); `onApplicationShutdown` — `close()`. `MongoTransactions.run(fn: (session) => Promise<T>)` =
  `client.withSession(s => s.withTransaction(() => fn(s)))` (F5) — JSDoc: колбэк может повториться
  (`TransientTransactionError`) → внутри без побочных эффектов (очереди, почта, HTTP). Репозитории принимают
  `session?: ClientSession` и передают `{ session }` (аналог `DbExecutor`). Dev/test/CI: single-node RS, URL с
  `directConnection=true` (F4); compose — `command: ['--replSet', 'rs0', '--bind_ip_all']`, healthcheck с
  `rs.initiate` (F4), порт `127.0.0.1:27017:27017`, `infra:up` Mongo-варианта — `up -d --wait`. CI (база и шаблон) —
  шаг `docker run -d -p 127.0.0.1:<port>:27017 mongo:8.0 --replSet rs0 --bind_ip_all` + цикл `docker exec … mongosh`
  до PRIMARY (без сторонних actions). Альтернатива — `mongodb-memory-server` 11.3 в тестах: не та же БД, что в dev/проде,
  скачивает бинарь `mongod` — отклонено (правило «реальная БД»).
- **D6. Outbox на MongoDB — та же транзакция + polling с lease; BullMQ без изменений.** Коллекция `outbox`:
  `{ _id: uuidv7, type, payload, createdAt (Clock), publishedAt: null, claimId?, claimedUntil? }`, индекс
  `outbox_unpublished_idx` `{ createdAt: 1 }` с `partialFilterExpression: { publishedAt: { $eq: null } }` (F9) — в
  миграции `0001_outbox` шаблона. `MongoOutboxWriter.append(session, event)` → `id`; `MongoOutboxReader.payloadOf(id)`;
  `MongoOutboxPublisher.publishBatch(limit)`: кандидаты (`publishedAt: null`, тип из маршрутов, lease свободен или
  истёк, сортировка `createdAt`, `limit`) → `updateMany` захвата с `claimId`/`claimedUntil = now + 30 с` по тем же
  условиям → выборка своих по `claimId` → `queue.add(type, { outboxEventId }, { jobId: id })` → `publishedAt = now`,
  снятие захвата. Сбой между `add` и отметкой — повтор после истечения lease тем же `jobId` (гарантия как у PG).
  `OutboxPublisherLoop` принимает интерфейс `{ publishBatch(limit): Promise<number> }` (выносится в core,
  не breaking). Модули: `MongoOutboxModule` (global, writer+reader), `MongoOutboxPublisherModule.forRoot({ routes })`.
  `OutboxJobData` — тот же (`outboxEventId: string`), процессоры проектов одинаковы для обеих БД. Альтернатива
  **change streams** — нужен свой учёт resume token, координация нескольких worker, окно oplog, а атомарность всё равно
  через запись в транзакции — отклонено.
- **D7. Релиз двумя шагами** (следствие F12 и правила README базы): PR-1 «пакеты» — changeset **minor** →
  `0.4.0` (шаблон не меняется, кроме `foundation_version`); PR-2 «шаблон» после публикации `0.4.0` — changeset patch →
  `v0.4.1` (тег шаблона с опцией `mongo`). Альтернатива: `template:check --local-packages` (pack пакетов рабочего
  дерева в рендер через `pnpm.overrides`) → всё в `0.4.0` одним PR — расширяет scope и меняет модель проверки;
  отдельная задача, если автор хочет единый релиз.
- **D8. Правила Mongo для проектов** (`db.md` ветки `mongo`): `_id` — строка UUID v7 (`uuidv7()` из `./mongo`,
  совместимо с `Uuid` контрактов); время — BSON Date (UTC); фильтры и `$set` только из примитивов после zod
  (не передавать объекты запроса; без `$where`/`$function`/`$accumulator`, F10); условие по другому документу в
  транзакции — запись в этот документ (`$inc: { version: 1 }`) или денормализация (F7); TTL — только уборка (F8);
  уникальность — уникальный индекс + `isDuplicateKey(err, 'index_name')`; индексы и коллекции — только миграциями;
  append-only коллекции — без update/delete в коде, в проде роль без `update`/`remove`; expand → migrate → contract,
  чтение терпит отсутствие новых полей (старые версии приложения).
- **D9. Шаблон.** `database` — новый вопрос перед `use_postgis` (`choices`, default `postgres`); `use_postgis` —
  `when: "[[ database == 'postgres' ]]"` + validator (F11). Целые PG-/Mongo-файлы — условным `_exclude` в
  `copier.yml`; файлы с общими частями — `.jinja` с `[% if database == 'mongo' %]`. Рендер `postgres` — **побайтно**
  как у `main` (не-`.jinja` файлы, ставшие `.jinja`, рендерят прежний текст) — проверка в VERIFY. Mongo-вариант
  запрещает импорт корней `@rkarakulov/api-kit`/`@rkarakulov/test-kit` (ESLint `no-restricted-imports` после пресета:
  `pg` не установлен — падение в рантайме, typecheck при `skipLibCheck` не ловит). Смена `database` у проекта через
  `copier update` не поддерживается — README/runbook.

**Противоречия и недоопределённость:**
- AGENTS шаблона §4.5 «outbox в Postgres» и ADR `0001-stack` — переписать под вариант (Jinja), инвариант не меняется.
- Инвариант «миграции — отдельный шаг» исключает ensure-indexes при старте (D4).
- Тексты плагина (`backend-nest`, `architect`, README) завязаны на Drizzle/PostgreSQL — нейтрализовать (плагин
  проектное читает из `AGENTS.md`/`db.md`, инвариант 6 базы).
- `waitForLockWaiter`/`truncateAll` — PG-специфичны, аналога в Mongo нет (нет блокировок строк); конкурентные тесты
  Mongo — через параллельные операции и конфликты записи. Не переносим.
- **S1 (scope, человеку).** Опция БД удваивает стоимость будущих DB-зависимых функций базы: F6 (identity в базу)
  придётся делать для обеих БД или объявить PG-only. Рекомендация: зафиксировать в AGENTS базы «DB-зависимая
  функция базы — для `postgres`; `mongo` — по отдельной задаче», решение по F6 — при её старте.
- Q1: образ `mongo:8.0` (рекомендация) vs `8.2`/`8.3`. Q2: `uuidv7()` своей реализацией на `node:crypto` (RFC 9562 §5.7,
  ~15 строк, без новой зависимости в PG-проектах — рекомендация) vs `uuid@14.0.3` (`v7`, без зависимостей).

## 8.2 Deviations from spec
**Решения оркестратора (2026-10-24, утверждено):**
- D1–D6, D8, D9 — как рекомендовано: драйвер `mongodb@^7.7.0` + zod-контракты; subpath-ы `@rkarakulov/api-kit/{core,mongo}`,
  `@rkarakulov/test-kit/{core,mongo}`, `pg`/`drizzle-orm`/`mongodb` — необязательные peer; свой мигратор `_migrations` +
  lock, отдельный шаг `db:migrate`; replica set везде, проверка при старте; outbox — коллекция с lease,
  `OutboxPublisherLoop` переиспользуется; правила `db.md` для Mongo; шаблон с вопросом `database`.
- D7 — два релиза: **этот запуск — только PR-1** (пакеты, changeset minor → `0.4.0`); шаблон (PR-2) — после
  публикации `0.4.0`, отдельным запуском.
- S1 — принять: в AGENTS базы — «DB-зависимая функция базы делается для postgres, для mongo — отдельной задачей»
  (инвариант 11).
- Q1 — `mongo:8.0`; Q2 — свой `uuidv7()` на `node:crypto`, без новой зависимости.
- PG-проекты не меняются: корни `@rkarakulov/api-kit` и `@rkarakulov/test-kit` — API без изменений (on-bike на PG).

**Отклонения coder (PR-1):**
- База ушла вперёд: `origin/main` = `75a7f6a` (пакеты `0.3.1`, не `a2d7134`/`0.3.0`); minor → `0.4.0` не меняется.
- Типы outbox (`OutboxRoutes`, `OutboxJobData`, `OutboxEvent`, `BatchPublisher`) — в `src/outbox/outbox.types.ts`,
  цикл — в `outbox.loop.ts` (план: всё в `outbox.loop.ts`). `OutboxEvent` вынесен из PG-файла `outbox.writer.ts`, чтобы
  Mongo-writer не тянул drizzle. Имена корня прежние; корень получил новые `coreEnvShape`, `defineCoreEnv` (+ типы
  `CoreEnv`, `BatchPublisher`) — добавление, не breaking.
- `MongoTransactions.run` задаёт транзакции `readConcern: snapshot`, `writeConcern: majority` (план: без опций) —
  согласованное чтение в транзакции, коммит не откатывается при смене PRIMARY.
- Сторож изоляции — `smoke/import-isolation.mjs <запрещённые> <входы…>` вместо `import-no-pg.mjs`: три прогона —
  `/core` без `pg`/`drizzle-orm`/`mongodb`, `/mongo` без `pg`/`drizzle-orm`, корни без `mongodb` (требование
  оркестратора «PG-корень не тянет `mongodb`»).
- test-kit в базе: `recreateTestMongoDatabase` вызывается в `beforeAll` теста стенда, а не в vitest `globalSetup`:
  `globalSetup` (окружение `__vitest__`) не резолвит условие `@app-foundation/source` → `@rkarakulov/api-kit/mongo`
  брался бы из `dist` (нет или устарел). У проектов пакеты — из `dist`, `globalSetup` шаблона (PR-2) — как в плане.
- api-kit `test/global-setup.ts` удаляет тестовую БД MongoDB (`foundation_api_kit_test`); индексы тесты создают сами.
- Дополнительно экспортированы: `assertReplicaSet`, `mongoUrl`, `mongoDatabaseName`, `MIGRATIONS_COLLECTION`,
  `MIGRATIONS_LOCK_COLLECTION`, `OUTBOX_LEASE_MS`, `MongoOutboxPublisher`, `MongoOutboxDoc` (api-kit/mongo),
  `clearCollections` (test-kit/mongo). `testRedisDb` — `src/test-redis.ts` (+ свой тест), корень реэкспортирует.

**Решения оркестратора (PR-2, 2026-10-24):**
- GitHub Packages не отдаёт `peerDependenciesMeta` → вариант (a): `packageExtensions` в `pnpm-workspace.yaml` рендера
  помечает драйвер другой БД необязательным (postgres — `mongodb`, mongo — `pg`, `drizzle-orm`) для
  `@rkarakulov/api-kit`/`test-kit`; `template:check` проверяет lock симметрично. Инвариант AC2 меняется на «рендер
  postgres = `main` + блок `packageExtensions` (+ `.copier-answers.yml` и AI-копия плагина)».

## 8.3 Security checklist
Затронуты: инфраструктура (compose, CI), секреты (`MONGO_URL`), зависимости (`mongodb`), доступ к данным.
1. **AuthN/AuthZ:** API-доступ не меняется. MongoDB в dev/CI — без auth, порт только `127.0.0.1:27017` (в отличие от
   PG-compose с паролем; открытый Mongo без auth — классическая утечка); прод — `MONGO_URL` с учётными данными и TLS,
   replica set/Atlas, приложение — пользователь с `readWrite` на свою БД (runbook).
2. **Входные данные:** фильтры и обновления — только из zod-валидированных примитивов (F10); запрет `$where`,
   `$function`, `$accumulator`; правило `db.md` + строка в контракте ревью шаблона («объект запроса в фильтре Mongo —
   HIGH»). `MONGO_URL` валидируется на старте (D3).
3. **Данные наружу:** health — только `up/down`; `isDuplicateKey` возвращает boolean, `keyValue` не пробрасывается;
   ошибки драйвера → `INTERNAL` через `ApiExceptionFilter`.
4. **Злоупотребления:** без изменений (лимиты в Redis).
5. **Секреты и логи:** `ApiExceptionFilter.describeForLog` — для ошибок с собственным `code` (Mongo) пишет имя +
   `code`, **не** `message` (в `errmsg` дубликата — значение ключа, F9); тест. Значение `MONGO_URL` не попадает в
   сообщения env, мигратора, `check-template` (маскирование пароля как у PG). `.env.example` — без учётных данных.
6. **Аудит:** append-only коллекции — правило D8 (код без update/delete, роль в проде).
7. **Зависимости/реестр:** `mongodb@^7.7.0` (официальный, возраст > `minimumReleaseAge`), его peer (`kerberos`,
   `snappy`, …) — необязательные, не ставятся; образ `mongo:8.0` — официальный; CI — без сторонних actions для Mongo.

## 9. Acceptance Criteria
1. `uvx copier copy … --data database=mongo`: `pnpm install` → `pnpm infra:up` → `db:migrate` (повторный — без
   изменений) → `pnpm check` зелёные; API `/v1/health` = 200 (`checks.database: up`), worker стартует;
   `template:check -- --data database=mongo` зелёный.
2. Рендер `database=postgres` (оба `use_postgis`) побайтно совпадает с рендером `main` (тот же `foundation_version`);
   `template-update` (с последнего тега) зелёный; on-bike не меняется.
3. Mongo-проект не содержит `pg`, `drizzle-orm`, `drizzle-kit` в lock-файле; PG-проект — `mongodb`.
4. `@rkarakulov/api-kit/{core,mongo}` и `@rkarakulov/test-kit/{core,mongo}` грузятся из `dist` без условия source и
   **не загружают** `pg`/`drizzle-orm` (смоук с resolve-хуком).
5. Интеграционные тесты на реальном MongoDB replica set: транзакция (commit/rollback/возврат значения), outbox
   (запись в транзакции, публикация с `jobId`, lease, повтор без дубля), мигратор (порядок, учёт, lock, ошибки),
   `isDuplicateKey`, стенд Mongo (guard-ы, `reset`, графы API/worker).
6. `--data database=mongo --data use_postgis=true` — ошибка валидации copier.
7. `pnpm check`, `pnpm build && pnpm smoke`, `claude plugin validate --strict .`, CI (все ноги матрицы) — зелёные;
   релизы `0.4.0` (пакеты) и `v0.4.1` (шаблон) — после «да» человека.

## 10. Documentation Impact
- База: `README.md` (таблица пакетов — subpath-ы `./core`/`./mongo`; вопрос `database` в «Новый проект»;
  «Разработка базы» — `infra:up` с MongoDB `:27018`; «Разработка шаблона» — `--data database=mongo`, env
  `MONGO_URL`/`MONGO_URL_TEST`, смена БД не поддерживается); `AGENTS.md` (§2 infra, §3 команды, §4 — инвариант
  «`./core` и `./mongo` не импортируют `pg`/drizzle; корень — PG без изменений API», правило S1).
- Шаблон (Jinja по `database`): `AGENTS.md.jinja` (§2, §3 — `db:generate`/`db:studio` только PG, §4.5–4.6, §8),
  `.claude/rules/db.md.jinja` (ветка Mongo — D8, `paths:` с `apps/api/src/db/**`), `backend.md.jinja` (репозиторий —
  драйвер MongoDB, тесты на реальном MongoDB), `docs/adr/0001-stack.md` → `.jinja`, `docs/runbooks/local-dev.md.jinja`
  (Mongo: RS, `directConnection`, миграции dev/прод, снятие lock, прод — auth/TLS/RS), `README.md.jinja`, `CLAUDE.md`
  → `.jinja` (context7: Drizzle | MongoDB), `tools/ai_review/review_contract.md` (строка F10).
- Плагин: `plugin/skills/backend-nest/SKILL.md`, `plugin/agents/architect.md`, `plugin/README.md` — БД из
  `AGENTS.md`/`db.md` проекта; `plugin.json` `0.1.2`; `pnpm template:sync`.
- CHANGELOG — через changesets. on-bike: `docs/tasks/2026-10-22-app-foundation/design.md` — строка F7 (опция MongoDB)
  после merge.

## 11. Implementation Context
Репозиторий — `app-foundation` (`/Users/romankarakulov/PROJECTS/app-foundation`), пути — от его корня. Чужой checkout
(`fix/text-field-focus-web`) не трогать: работать в отдельном worktree от `origin/main`.
PR-1: ветка `feature/mongo-packages`; PR-2: `feature/template-mongo` от `main` после публикации `0.4.0`.

### ENTRY POINTS
- `packages/api-kit/src/index.ts` (корень), новые `src/core.ts`, `src/mongo/index.ts`; `package.json` `exports` и
  `publishConfig.exports` (оба места).
- `packages/test-kit/src/index.ts`, новые `src/core.ts`, `src/mongo/index.ts`.
- `copier.yml`; `template/apps/api/src/{app,worker}.module.ts`; `scripts/check-template.mjs`; `.github/workflows/ci.yml`.

### FILES TO CREATE / MODIFY
**PR-1 · A. api-kit core (без смены API корня)**
| Файл | Изменение |
|---|---|
| `packages/api-kit/src/core.ts` | новый: экспорт DB-нейтрального — clock, config (`ConfigModule`, `coreEnvShape`, `defineCoreEnv`, `CoreEnv`, `ENV`, `mailEnvShape`, `MailEnv`, `EnvDefinition`), errors, http, mail, queue, redis, `OutboxPublisherLoop`, `OutboxRoutes`, `OutboxJobData` |
| `packages/api-kit/src/index.ts` | `export * from './core.ts'` + PG-часть (как сейчас); список имён корня не меняется |
| `packages/api-kit/src/config/env.ts` | `coreEnvShape`, `CoreEnv`, `defineCoreEnv`; `baseEnvShape = { ...coreEnvShape, DATABASE_URL }`; `EnvDefinition<TEnv extends CoreEnv = BaseEnv>` |
| `src/config/config.module.ts`, `src/queue/queue.module.ts`, `src/redis/redis.module.ts`, `src/http/http-app.ts` | ограничение `CoreEnv` вместо `BaseEnv` |
| `src/outbox/outbox.loop.ts` | новый: `OutboxPublisherLoop` (из `outbox.publisher.ts`) на интерфейсе `BatchPublisher { publishBatch(limit) }`, `OutboxRoutes`, `OutboxJobData`; `outbox.publisher.ts` — реэкспорт/импорт отсюда |
| `src/errors/api-exception.filter.ts` | `describeForLog`: собственный `code` ошибки (Mongo) — в лог, `message` — нет |
| `package.json` | `exports`/`publishConfig.exports` `./core`; `peerDependenciesMeta` `pg`, `drizzle-orm` `optional` |
| `src/config/env.test.ts`, `src/errors/api-exception.filter.test.ts`, `src/outbox/outbox.loop.test.ts` | тесты (D3, §8.3 п.5, цикл на фейковом публикаторе с fake timers) |

**PR-1 · B. api-kit mongo**
| Файл | Изменение |
|---|---|
| `packages/api-kit/src/mongo/index.ts` | новый вход `./mongo` |
| `src/mongo/env.ts` (+ `env.test.ts`) | `mongoUrl`, `mongoEnvShape`, `MongoEnv`, `mongoDatabaseName(url)` (F2, F3) |
| `src/mongo/mongo.module.ts` | `MongoModule.forRoot()`, `MONGO_CLIENT`, `MONGO_DB`, проверка replica set (чистая функция `assertReplicaSet(hello)` + unit), shutdown |
| `src/mongo/transactions.ts` | `MongoTransactions.run` (D5) |
| `src/mongo/errors.ts` (+ unit) | `isDuplicateKey(error, indexName?)`: `code === 11000` (`MongoServerError`/`MongoBulkWriteError`), имя индекса — из `errmsg` (F9) |
| `src/mongo/uuid.ts` (+ unit) | `uuidv7()` (Q2): версия 7, вариант `10`, порядок по времени между мс, проходит `Uuid` contracts-core |
| `src/mongo/migrator.ts` | `runMongoMigrations`, `MongoMigration` (D4) |
| `src/mongo/outbox/{outbox.writer,outbox.reader,outbox.publisher,outbox.module,outbox.collection}.ts` | D6; `outbox.collection.ts` — имя коллекции, тип документа, `ensureOutboxIndexes(db)` для миграции проекта |
| `src/mongo/*.int.test.ts` | реальный RS (TESTS) |
| `test/test-env.ts`, `test/global-setup.ts`, `test/mongo.ts` | `MONGO_URL_TEST` (`mongodb://127.0.0.1:27018/foundation_test?directConnection=true` → `foundation_api_kit_test`), пересоздание тестовой БД; guard `*_test` |
| `package.json` | `exports` `./mongo`; peer `mongodb: ^7.7.0` (`optional`), devDep `mongodb: catalog:` |
| `pnpm-workspace.yaml` | catalog `mongodb: ^7.7.0`; `pnpm-lock.yaml` |
| `infra/docker-compose.test.yml` | `mongo: image mongo:8.0`, `--replSet rs0 --bind_ip_all`, `127.0.0.1:27018:27017`, healthcheck c `rs.initiate` (F4) |
| `turbo.json` | `test.env` + `MONGO_URL_TEST` |
| `scripts/start-mongo-rs.sh` | новый: `docker run` + ожидание PRIMARY (для CI базы; аргумент — порт) |
| `.github/workflows/ci.yml` (`check`), `release.yml` (`verify`) | шаг `scripts/start-mongo-rs.sh 27018` до `pnpm check` |

**PR-1 · C. test-kit**
| Файл | Изменение |
|---|---|
| `packages/test-kit/src/harness-core.ts` | новый внутренний: общее ядро стенда (подмены `ENV`/`CLOCK`/`MAILER`, HTTP-приложение, `configureApp`, worker, Redis, часы); импорт из `@rkarakulov/api-kit/core` |
| `src/harness.ts` | PG-стенд поверх ядра; API и поведение — прежние |
| `src/core.ts` | новый вход `./core`: `TestClock`, `DAY/HOUR/MINUTE`, `FakeMailer`, `testRedisDb` |
| `src/mongo/{db,harness,index}.ts` | `testMongoDatabaseName`, `recreateTestMongoDatabase({ url, migrations })` (dropDatabase + `runMongoMigrations`), `clearCollections(db, { except })` (`deleteMany`, кроме `_migrations*` и `system.*`, индексы остаются), `createMongoApiHarness` → `{ env, clock, mailer, app, worker, client, db, redis, reset, close }` |
| `src/index.ts` | корень — без изменений имён (`db.ts` → `testRedisDb` переезжает в core, реэкспорт) |
| `package.json` | `exports` `./core`, `./mongo`; peer `mongodb` `optional`, `pg`/`drizzle-orm` `optional` |
| `test/*`, `src/mongo/*.test.ts`, `src/mongo/harness.int.test.ts` | тесты |

**PR-1 · D. Смоук, документы, релиз**
- `smoke/import.mjs` — `+ api-kit/core`, `api-kit/mongo`, `test-kit/core`, `test-kit/mongo`; новый
  `smoke/import-no-pg.mjs` (`module.registerHooks({ resolve })` бросает на `pg`, `drizzle-orm*` → импорт четырёх
  входов проходит); `smoke/consumer.ts` — типы Mongo-входов (`MongoModule`, `defineCoreEnv`, `createMongoApiHarness`);
  `scripts/smoke-consumer.mjs` — вызов `import-no-pg.mjs`.
- `.changeset/<name>.md` — minor (`@rkarakulov/api-kit`, `@rkarakulov/test-kit`; fixed → `0.4.0`); `README.md`,
  `AGENTS.md` базы (§10).

**PR-2 · E. copier и шаблон `apps/api`** (после публикации `0.4.0`)
| Файл | Изменение |
|---|---|
| `copier.yml` | вопрос `database` (`choices`: PostgreSQL (Drizzle) → `postgres`, MongoDB → `mongo`; default `postgres`); `use_postgis`: `when`, validator (F11); `_exclude` — условные шаблоны по **пути назначения** (без `.jinja`: copier сопоставляет `dst_relpath`): при `mongo` — `apps/api/drizzle`, `apps/api/drizzle.config.ts`, `apps/api/src/db/schema.ts`, `apps/api/test/db.ts`; при `postgres` — `apps/api/src/db/migrations`, `apps/api/src/db/migrate.ts` |
| `template/apps/api/package.json.jinja` | Mongo: deps `mongodb: catalog:`, без `pg`/`drizzle-orm`; devDeps без `@types/pg`/`drizzle-kit`, `+ tsx: catalog:`; scripts `db:migrate` = `tsx src/db/migrate.ts`, без `db:generate`/`db:studio` |
| `template/apps/api/.env.example.jinja` | Mongo: `MONGO_URL=mongodb://127.0.0.1:27017/[[ db_name ]]?directConnection=true` вместо `DATABASE_URL` |
| `src/app.module.ts` → `.jinja`, `src/worker.module.ts` → `.jinja` | Mongo: импорт из `@rkarakulov/api-kit/core` + `/mongo`; `MongoModule.forRoot()`, `MongoOutboxModule`, `MongoOutboxPublisherModule.forRoot({ routes: {} })` |
| `src/main.ts` → `.jinja`, `src/http-app.ts.jinja`, `src/error-messages.ts.jinja` | Mongo: импорты из `/core` |
| `src/config/env.ts` → `.jinja`, `env.test.ts` → `.jinja` | Mongo: `defineCoreEnv({ ...mongoEnvShape, ...mailEnvShape, CORS_ORIGINS })`; тест `MONGO_URL` (обязателен, multi-host принимается, без имени БД — ошибка) |
| `src/db/index.ts` → `.jinja` | Mongo: реэкспорт `MongoTransactions`, тип `ClientSession` как `DbSession`, коллекции модулей |
| `src/db/migrations/{index,0001_outbox}.ts` | новые (Mongo): `0001_outbox` — `ensureOutboxIndexes(db)` |
| `src/db/migrate.ts` | новый (Mongo): env → `MongoClient` → `runMongoMigrations` → `close`; код выхода ≠ 0 при ошибке |
| `src/modules/health/health.service.ts.jinja`, `health.controller.test.ts.jinja` | Mongo: `MONGO_DB.command({ ping: 1 })`; тест up/down |
| `test/test-env.ts.jinja`, `test/global-setup.ts` → `.jinja`, `test/harness.ts.jinja`, `test/harness.int.test.ts.jinja` | Mongo: `MONGO_URL_TEST` (`…/[[ db_name ]]_test?directConnection=true`), `recreateTestMongoDatabase` с миграциями проекта, `createMongoApiHarness`; тест: health 200, `ENV` в графах, публикатор есть, `reset()` чистит `outbox`, `_migrations` остаётся, индекс `outbox_unpublished_idx` есть |
| `tsconfig.json.jinja`, `vitest.config.mts.jinja` | Mongo: без `drizzle.config.ts` в `include`, комментарий про drizzle — только PG; комментарий БД |
| `template/eslint.config.mjs` → `.jinja` | Mongo: `no-restricted-imports` корней `@rkarakulov/api-kit`, `@rkarakulov/test-kit` в `apps/api/**` (D9) |

**PR-2 · F. Инфраструктура и CI шаблона**
- `template/infra/docker-compose.dev.yml.jinja` — Mongo: сервис `mongo` (D5) и том `mongodata` вместо `postgres`.
- `template/package.json.jinja` — Mongo: `infra:up` с `--wait`.
- `template/pnpm-workspace.yaml.jinja` — Mongo: `mongodb: ^7.7.0` вместо `pg`/`@types/pg`/`drizzle-*`.
- `template/turbo.json` → `.jinja` — `test.env`: `MONGO_URL_TEST` вместо `DATABASE_URL_TEST`.
- `template/.github/workflows/ci.yml.jinja` — Mongo: без service `postgres`, шаг запуска RS (inline, как
  `scripts/start-mongo-rs.sh`), env `MONGO_URL_TEST`.

**PR-2 · G. Проверки базы**
- `scripts/check-template.mjs` — `database` из `--data`: `serviceUrls`/`checkServices` для Mongo (`MONGO_URL`,
  `MONGO_URL_TEST` из env или значения рендера; `mongodb` из рендера через `createRequire`; `ping` + `hello.setName`,
  иначе — ошибка с подсказкой про replica set); `smokeServices` — `db:migrate` дважды для Mongo (идемпотентность);
  шапка-комментарий.
- `.github/workflows/ci.yml` — `template`: `matrix.include` `{database: postgres, use_postgis: false, e2e: true}`,
  `{database: postgres, use_postgis: true}`, `{database: mongo}`; service `postgres` — только для `postgres` (пустой
  `image`, §8), шаг RS — для `mongo`; `template-update` — нога `mongo` (пропуск, если в `copier.yml` базового тега
  нет вопроса `database`).
- `.github/workflows/release.yml` — `template-release-check`: нога `mongo` (`--strict`).

**PR-2 · H. Процесс и документы** — §10; `.changeset/<name>.md` — patch (шаблон, `v0.4.1`).

### TYPES / CONTRACTS
- `CoreEnv = { NODE_ENV; PORT; REDIS_URL; TRUST_PROXY }`; `BaseEnv = CoreEnv & { DATABASE_URL }` (как сейчас);
  `MongoEnv = { MONGO_URL: string }`.
- `defineCoreEnv<const T extends z.ZodRawShape>(extra: T): EnvDefinition<CoreEnv & z.infer<…>>`.
- `MongoModule.forRoot(options?: { requireReplicaSet?: boolean /* default true */ }): DynamicModule`;
  `MONGO_CLIENT: MongoClient`, `MONGO_DB: Db`.
- `MongoTransactions.run<T>(fn: (session: ClientSession) => Promise<T>): Promise<T>`.
- `isDuplicateKey(error: unknown, indexName?: string): boolean`; `uuidv7(): string`.
- `MongoMigration = { id: string; up(db: Db): Promise<void> }`;
  `runMongoMigrations({ db, migrations, now? }): Promise<{ applied: string[] }>`.
- `MongoOutboxWriter.append(session: ClientSession | undefined, event: OutboxEvent): Promise<string>`;
  `MongoOutboxReader.payloadOf(id: string): Promise<unknown>`; `MongoOutboxPublisher.publishBatch(limit?): Promise<number>`.
- `createMongoApiHarness<TEnv extends CoreEnv & MongoEnv>(options: { apiModule; workerModule?; env; httpPrefix;
  clearExcept?; configureApp? }): Promise<MongoApiHarness<TEnv>>`.
- API-контракты проекта, `HealthResponse`, `OutboxJobData`, `OutboxEvent` — без изменений.

### TESTS / CHECKS
- **api-kit unit:** env core/base (прежние кейсы зелёные, `defineCoreEnv` без `DATABASE_URL`), `mongoUrl` (single,
  multi-host, `+srv`, без имени БД, чужая схема; сообщение без URL), `isDuplicateKey` (синтетические ошибки, имя
  индекса из `errmsg`), `uuidv7` (формат, порядок между мс, `Uuid.parse`), `assertReplicaSet`, фильтр (лог Mongo-кода
  без `message`), `OutboxPublisherLoop` на интерфейсе.
- **api-kit integration (MongoDB RS :27018, Redis):** `MongoModule` (БД из URL, ping, shutdown закрывает клиент),
  `MongoTransactions` (commit, rollback, возврат значения, повтор при конфликте записи двух транзакций одного
  документа), outbox (`append` в транзакции + откат; `publishBatch`: `jobId = id`, `publishedAt`, чужие типы не
  трогает, лимит пачки, повтор после сброса `publishedAt` без второй задачи, захваченное другим публикатором — пропуск
  до истечения lease по `Clock`), мигратор (порядок, однократность, lock, неизвестный применённый id, упавшая — не
  записана и lock снят), `isDuplicateKey` на реальной ошибке, Nest-граф Mongo-модулей (аналог `modules.int.test.ts`).
  PG-тесты — без изменений, зелёные.
- **test-kit:** unit `testMongoDatabaseName`; integration `createMongoApiHarness` (не-`_test` БД и Redis 0 — ошибка,
  `reset` чистит коллекции и сохраняет индексы и `_migrations`, часы/почта, worker, `configureApp`, `close`),
  `recreateTestMongoDatabase`; PG-стенд после выноса ядра — прежние тесты зелёные.
- **Смоук:** `pnpm build && pnpm smoke` — импорт 4 новых входов из `dist`, `import-no-pg.mjs`, tsc потребителя.
- **Шаблон:** jest/vitest рендера Mongo (env, health, harness int); `template:check` — `postgres`, `postgres +
  use_postgis`, `mongo` (`--e2e` — в одной ноге `postgres`); `diff -r` рендеров `main` и ветки при `postgres` (оба
  `use_postgis`) — пусто (AC2, фиксируется в §12); `copier copy --data database=mongo --data use_postgis=true` — ошибка.
- **Порядок:** после каждого слайса — его тесты + `pnpm check` базы; после PR-1 — `pnpm build && pnpm smoke`,
  `pnpm template:check` (PG не сломан); после E–G — `template:check` всех трёх ног локально (`pnpm infra:up` базы не
  подходит — рендер: `pnpm infra:up` рендера или env-адреса); финально — `claude plugin validate --strict .`, CI.

### OUT OF SCOPE
См. §4. Плюс: `--local-packages` в `template:check` (D7, альтернатива), миграции «вниз», статус миграций отдельной
командой, `$jsonSchema`-валидаторы, примеры доменных коллекций в шаблоне.

### FILES TO READ
- База: `README.md`, `AGENTS.md`, `copier.yml`, `packages/api-kit/src/{index.ts,config/env.ts,database/*,outbox/*,
  errors/api-exception.filter.ts,modules.int.test.ts}`, `packages/api-kit/test/*`, `packages/test-kit/src/{db,harness,
  index}.ts`, `packages/test-kit/test/*`, `smoke/{import.mjs,consumer.ts}`, `scripts/{check-template,smoke-consumer}.mjs`,
  `.github/workflows/{ci,release}.yml`, `infra/docker-compose.test.yml`, `template/apps/api/**`,
  `template/infra/docker-compose.dev.yml.jinja`, `template/.github/workflows/ci.yml.jinja`,
  `template/.claude/rules/{db,backend}.md.jinja`, `template/AGENTS.md.jinja`, `template/docs/runbooks/local-dev.md.jinja`.
- on-bike (пример требований): `apps/api/src/modules/identity/identity.repository.ts` (ротация, lease, `uuidv7`).
- Документация: драйвер MongoDB Node 7.x (транзакции, `withTransaction`, `findOneAndUpdate`, CSOT/таймауты), MongoDB 8.0
  (replica set, partial/TTL индексы, транзакции и DDL), copier (`_exclude`, `when`, `choices`, `validator`), GitHub
  Actions (`services`, условный service) — через context7/официальные docs, не по памяти.

### Слайсы и порядок
| # | PR | Слайс | Проверка после слайса |
|---|---|---|---|
| A | 1 | `./core` api-kit, env core, ограничения `CoreEnv`, `outbox.loop.ts`, лог-код в фильтре, optional peers | `pnpm --filter @rkarakulov/api-kit test`, `pnpm check`, `pnpm build && pnpm smoke` |
| B1 | 1 | infra/CI Mongo RS (compose test, `start-mongo-rs.sh`, `check`/`verify`), `./mongo`: env, `MongoModule`, транзакции, `isDuplicateKey`, `uuidv7` | unit + int api-kit на `pnpm infra:up`, `pnpm check` |
| B2 | 1 | мигратор + Mongo outbox (writer/reader/publisher/модули) | int-тесты D4, D6; `pnpm check` |
| C | 1 | test-kit: ядро стенда, `./core`, `./mongo` | test-kit unit+int (PG и Mongo), `pnpm check` |
| D | 1 | смоук (`import-no-pg`), changeset minor, README/AGENTS базы | `pnpm build && pnpm smoke`, `pnpm template:check` (PG не сломан) |
| R1 | 1 | ревью (Claude + Codex), PR, релиз `0.4.0` после «да» человека | CI, `template-release-check` |
| E | 2 | `copier.yml` + `apps/api` Mongo-вариант | `template:check -- --data database=mongo`, `diff -r` PG-рендеров = пусто |
| F | 2 | compose, CI шаблона, turbo, catalog | `template:check` mongo; рендер CI — `actionlint` по возможности |
| G | 2 | `check-template.mjs`, матрица `ci.yml`, `release.yml`, `template-update` | все ноги `template:check` локально, CI PR |
| H | 2 | документы шаблона/базы, плагин + `template:sync`, changeset patch | `pnpm check`, `claude plugin validate --strict .` |
| R2 | 2 | ревью, PR, релиз `v0.4.1` после «да» человека; on-bike `design.md` | CI, `template-release-check` (обе БД) |

## 12. Outcome
**PR-1 (пакеты) — реализован**, ветка `feature/mongo-packages` (от `origin/main` `75a7f6a`), запушена, PR не открыт.
Шаблон, `copier.yml`, плагин — не тронуты (`git diff origin/main -- template copier.yml` пусто).

Коммиты: `9ae1f0d` (A: `./core` api-kit), `74ed5d4` (B1: `./mongo` env/модуль/транзакции/ошибки/uuidv7, MongoDB RS в
infra и CI базы), `29657d7` (B2: мигратор, outbox), `24db5f6` (C: test-kit ядро, `./core`, `./mongo`), `4d81a90`
(D: смоук изоляции, changeset minor, README/AGENTS).

Проверки (свои контейнеры postgres:18 :55433, redis:8.8 :56380, mongo:8.0 RS :57018 через
`scripts/start-mongo-rs.sh`, для рендера postgres:18 `my_app` :55432; после проверок удалены):
- `pnpm check` (env `*_URL_TEST` на свои контейнеры) — EXIT 0, `Tasks: 12 successful, 12 total`; тот же гейт
  прошёл в pre-push.
- `pnpm build && pnpm smoke` — EXIT 0: `import: 11 входов пакетов загружены из dist`; `import-isolation`:
  `/core` — без pg, drizzle-orm, mongodb; `/mongo` — без pg, drizzle-orm; корни и `outbox-schema` — без mongodb;
  негативная проверка (`pg` для корня, `mongodb` для `/mongo`) — сторож срабатывает.
- Корни: экспорты `@rkarakulov/api-kit` — все прежние + `coreEnvShape`, `defineCoreEnv`; `@rkarakulov/test-kit` —
  без изменений (сверка ключей модулей из `dist`).
- `pnpm template:check` (PG, `--defaults`, опубликованные `@rkarakulov/*` 0.3.1) — `✓ шаблон проверен`, EXIT 0.
- Healthcheck compose (`mongo` в `infra/docker-compose.test.yml`) — `up --wait` → Healthy за ~5 с, PRIMARY.
- Не проверено локально: CI GitHub Actions (шаг `scripts/start-mongo-rs.sh 27018` в `check` и release `verify`),
  `claude plugin validate` (плагин не менялся).
- Известное: `@rkarakulov/ui` jest — таймауты 5 с при первом прогоне под нагрузкой машины (load avg ~26),
  повтор зелёный; к задаче не относится.

Остаётся (PR-2, после публикации `0.4.0`): E–H — `copier.yml` (`database`, `use_postgis` when+validator, условный
`_exclude`), Mongo-вариант `apps/api`, compose/CI/turbo/catalog шаблона, `check-template.mjs` (Mongo-сервисы,
`db:migrate` дважды), матрица `template`/`template-update`/`template-release-check`, документы шаблона и плагина,
`pnpm template:sync`, changeset patch → `v0.4.1`; on-bike `design.md` (F7) после merge.

**PR-2 (шаблон) — реализован**, ветка `feature/mongo-template` (от `origin/main` `d9753d0`, пакеты `0.4.0`), запушена,
PR не открыт. Коммиты: `b5fe298` (E: `copier.yml` + Mongo-вариант `apps/api`, ESLint), `abb3c03` (F: compose, catalog,
`packageExtensions`, turbo, CI шаблона), `f034281` (G: `check-template.mjs`, матрицы `ci.yml`/`release.yml`), `727b9a2`
(H: документы шаблона/базы, плагин 0.1.2, `template:sync`, changeset patch), `d57e1ae` (H: отступ `backend.md`),
`3063159` (G: `copier update` с тега без `database`).

Отклонения от плана (8.2 — дописать оркестратору):
- **GitHub Packages не отдаёт `peerDependenciesMeta`** в метаданных реестра (проверено `curl` packument
  `@rkarakulov/api-kit` 0.4.0) → pnpm ставил необязательные peer: PG-проекты получали `mongodb`, Mongo — `pg`/drizzle.
  Решение оркестратора (a), см. 8.2: `packageExtensions` в обоих рендерах (`4d6a2c9`), `template:check` проверяет
  lock (postgres — без `mongodb`, mongo — без `pg`/`drizzle-*`).
- Рендер `postgres` побайтно = `main`, **кроме**: блока `packageExtensions` в `pnpm-workspace.yaml`, `.copier-answers.yml` (+`database: postgres`, неизбежно — ответ
  нового вопроса) и AI-копии плагина `.ai/dev-kit/{README.md,agents/architect.md,skills/backend-nest/SKILL.md}`,
  `.agents/skills/backend-nest/SKILL.md` (нейтрализация текстов плагина по §10 + версия 0.1.2).
- `copier.yml`: условия `_exclude` — `(database | default('postgres'))`: `copier update` рендерит исключения новой
  версии и для старой копии с ответами тега без вопроса `database` — без `default` падал `UndefinedError` (найдено
  локальной копией job `template-update`).
- `db:migrate` Mongo пишет итог в stdout (`process.stdout.write`; `console.log` запрещён пресетом ESLint); только
  `MONGO_URL` читается `loadMongoUrl()` из `config/env.ts` (шагу деплоя не нужны Redis/почта).
- Шаблон: `review_contract.md`, `CLAUDE.md`, `turbo.json`, `eslint.config.mjs`, `docs/adr/0001-stack.md`, `main.ts`,
  `env*.ts`, `db/index.ts`, `{app,worker}.module.ts`, `test/global-setup.ts` → `.jinja` (рендер PG прежний).
- `template-update`/`template-release-check` — матрицей `database: [postgres, mongo]` (пустой `image` выключает
  service PostgreSQL — подтверждено docs GitHub Actions: «If … image is assigned an empty string, the service will
  not start»); отдельный job не понадобился.

Проверки (свои контейнеры: mongo:8.0 RS `:57017` (`scripts/start-mongo-rs.sh`), redis:8.8 `:56379`,
postgres:18 `:55432`, imresamu/postgis:18-3.6 `:55434`; адреса — env `MONGO_URL*`/`DATABASE_URL*`/`REDIS_URL*`):
- `diff -r` рендеров `origin/main` (`v0.4.0`) и ветки, `--defaults` и `--data use_postgis=true`: отличия только
  `.copier-answers.yml` (`_commit`, `database: postgres`), блок `packageExtensions` (`mongodb` optional) в
  `pnpm-workspace.yaml` и 4 файла AI-копии плагина (см. выше); остальное — пусто.
- `pnpm check` базы (`pnpm infra:up`, затем `infra:down`) — EXIT 0, `Tasks: 12 successful, 12 total`;
  `template:sync --check` — 44 файла совпадают; pre-commit/pre-push — зелёные.
- `pnpm template:check -- --data database=mongo --e2e` — `✓ шаблон проверен`: lock без `pg`/`drizzle-*`; MongoDB
  ping + replica set; `pnpm check` рендера (api: 5 файлов, 21 тест, в т.ч. стенд Mongo 7 int); build, dist API
  грузится; `db:migrate` + повторный «новых миграций нет»; `/v1/health` 200, worker 5 с, CORS; SSR/PWA; Playwright
  5 passed; `expo export android`.
- `pnpm template:check -- --data database=postgres --data use_postgis=false --e2e` — `✓ шаблон проверен` (`pnpm check`, build, миграции drizzle, `/v1/health`, worker, SSR/PWA, Playwright
  5 passed, `expo export android`).
- `pnpm template:check -- --data database=postgres --data use_postgis=true` — `✓ шаблон проверен` (PostGIS-образ `:55434`).
- Негатив: `copier copy --data database=mongo --data use_postgis=true` → `ValidationError … use_postgis: PostGIS —
  только при database=postgres`.
- ESLint Mongo-рендера: импорт `@rkarakulov/api-kit` и `@rkarakulov/test-kit` в `apps/api` → 2 ошибки
  `no-restricted-imports`; `/core` — без ошибки.
- `node dist/db/migrate.js` (прод-путь): первый — «миграции применены: 0001_outbox», второй — «новых миграций нет»;
  `MONGO_URL` с паролем без имени БД → код 1, пароль в выводе отсутствует.
- Локальная копия job `template-update`: postgres `v0.4.0 → HEAD` — без `*.rej`/конфликтов, = свежий рендер;
  mongo — пропуск (в `v0.4.0` нет вопроса `database`), с коммита ветки `727b9a2 → HEAD` — OK.
- `claude plugin validate --strict .` — `✔ Validation passed`.
- NOT VERIFIED: CI GitHub Actions (матрицы, шаг replica set в CI шаблона, `actionlint` не установлен — YAML
  разобран Ruby); compose Mongo рендера (`infra:up --wait`) локально не запускался (запуск отклонён авто-режимом) —
  healthcheck идентичен проверенному в PR-1 `infra/docker-compose.test.yml`.

Ревью PR #15 (APPROVE, замечания исправлены в `d2b31a6`): `db:migrate` — ошибка драйвера с числовым `code` выводится
как `name (code N, codeName)` без `message`/`keyValue` (`describeMigrateError` + тест на синтетической 11000);
`.prettierignore` → `.jinja` (`apps/api/drizzle/meta` только для postgres); шаг CI `template` — негатив validator;
`template:check` mongo — повторная миграция `node dist/db/migrate.js` («новых миграций нет»); changeset — строка про
`packageExtensions` в PG. Повторно: `pnpm check` EXIT 0 (12/12); `template:check` mongo `--e2e`, postgres `--e2e`,
postgres + PostGIS — `✓`; `diff -r` PG-рендеров — только `pnpm-workspace.yaml` (`packageExtensions`),
`.copier-answers.yml`, AI-копия плагина.

Follow-up (b): если GitHub Packages начнёт отдавать `peerDependenciesMeta` или драйверы уйдут из `peerDependencies`
пакетов — убрать `packageExtensions` из `pnpm-workspace.yaml.jinja` (обе ветки) и обновить описание в README базы.
