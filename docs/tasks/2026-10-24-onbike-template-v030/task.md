# on-bike на шаблоне app-foundation `v0.3.0`

## 1. Title
`copier update` до `v0.3.0`, пакеты `@rkarakulov/*` 0.3.0, смоук web и CI — на точках расширения шаблона; мелкие фиксы
деплоя и dev-окружения API.

## 2. Goal
Убрать локальные отличия on-bike, которые появились из-за пробелов шаблона (F5b, follow-ups app-foundation
`docs/tasks/2026-10-24-app-foundation-followups/task.md` §12 «Для on-bike»): `_commit` — тег `v0.3.0` сам по себе,
`playwright.config.ts`/`urls.ts`/`turbo.json`/CI `web` — шаблонные, проектное — в `apps/app/e2e/project.ts` и у якорей CI.
Поведение on-bike (CSRF, cookie-сессия web, смоук с API, деплой dev) не меняется.

## 3. Scope
1. `uvx copier@9.19.1 update --vcs-ref v0.3.0 --trust --defaults`, разбор конфликтов; `_commit: v0.3.0` без ручной правки.
2. `@rkarakulov/*` → 0.3.0 (каталог `pnpm-workspace.yaml`, lockfile).
3. e2e: `e2e/fixtures.ts`, `console-errors.ts`, `urls.ts`, `playwright.config.ts` — шаблонные; on-bike — `e2e/project.ts`
   (API/worker при `E2E_API=1`, `webServerEnv`, 401 refresh в `expectedResourceErrors`), `MAILPIT_URL` → `e2e/mailpit.ts`;
   `turbo.json` без `passThroughEnv`; CI `check` — `pnpm build`, `web` — шаблон с якорями (services/env/шаги API и
   миграций on-bike) и `pnpm e2e:web`. `workflow_call`, триггеры и `concurrency` для `deploy-dev.yml` — без изменений.
4. `apps/api/src/http-app.ts` — реализация on-bike (CSRF, credentials) под именем шаблона `configureHttp`; `main.ts` = шаблон.
5. `infra/deploy/deploy.sh`: вывод `compose run --rm migrate` — в `${ON_BIKE_DIR}/migrate.log` (600) на сервере, в Actions —
   код выхода и подсказка; runbook деплоя «Логи».
6. API вне production при пустом `CORS_ORIGINS` — одна строка warn при старте; тест.
7. §12 — перечень локальных отличий от рендера `v0.3.0` (скрипт).
8. (решение автора, отдельный коммит) Бренд в пользовательских строках — «Покатим»; внутреннее имя on-bike не меняется.

## 4. Out of Scope
Стенд API шаблона через `configureApp` (`test/harness.ts`) — `v0.3.1`; CORS/CSRF в шаблоне (F6); prod-деплой;
переименование пакетов, репозитория, образов, БД, bundle id/scheme, cookie.

## 5. Architecture Context
copier update — трёхстороннее слияние (база — рендер `v0.2.0`, «их» — рендер `v0.3.0`, «наши» — on-bike). Точки
расширения смоука и CI — D4 follow-ups app-foundation: `e2e/project.ts` в `_skip_if_exists`, `pnpm e2e:web` = turbo
`--env-mode=loose`, якорные комментарии в CI `web`.

## 7. Implementation Notes
- Конфликты (9): `.github/workflows/ci.yml`, `turbo.json`, `apps/api/src/{main,http-app,http-app.test}.ts`,
  `apps/app/{playwright.config.ts,e2e/urls.ts,e2e/web.spec.ts}`, `docs/runbooks/local-dev.md`.
- Предупреждение CORS — в `configureHttp` (`main.ts` остаётся шаблонным), `Logger` Nest; тесты с `logger: false` его
  не печатают.

## 8.1 Requirements Consistency
- `turbo.json`: «к шаблонному» — кроме `ADMIN_BASE` в `env` задачи `build` (админка под `/admin/` в деплое dev,
  `apps/admin/vite.config.ts`): turbo в strict env без него не передаст переменную сборке admin и не учтёт её в
  хеше кеша. Остаётся локальным отличием.

## 8.2 Deviations from spec
- **Смоук «без API»: Главная гостя — «Нет соединения», а не редирект на регистрацию.** На шаблонном `urls.ts` API без
  `E2E_API` — недоступный адрес; восстановление сессии по сети не удаётся, и это не выход (F5b, `onbike-app.md`
  «Сессия в вебе»): гард оставляет Главную с «Нет соединения» и повтором. Прежний смоук проходил без `E2E_API`
  только потому, что ходил в dev-API на `:3000`. Шаги «Главная без входа» и «/ui-kit в production» проверяют оба
  варианта (`expectGuestHome`): с API — `/register`, без API — «Нет соединения» + «Повторить» на `/`.
- **copier перезаписал PNG on-bike** (`public/icons/*`, `assets/images/favicon.png`) рендером шаблона без конфликта
  (в шаблоне `v0.2.0..v0.3.0` они не менялись) — возвращены из `HEAD`.
- **`configureHttp(app, env)`: `env` — `Pick<Env, 'CORS_ORIGINS' | 'NODE_ENV'>`** (было только `CORS_ORIGINS`) — для
  предупреждения п. 6; `main.ts` передаёт весь `Env`, стенд `v0.3.1` (`configureHttp(app, env)`) — тоже.
- **Бренд (п. 8) — не TDD-красным первым:** строки заменены, затем обновлены тесты, сверяющие тексты; добавлены
  проверки бренда в `verification-email.test.ts` и `packages/i18n/src/index.test.ts`.

## 8.3 Security checklist
1. AuthN/AuthZ — не меняются (CSRF и CORS с credentials on-bike сохранены, тесты `http-app.test.ts`).
2. Входные данные — без изменений.
3. Данные наружу — вывод миграций (SQL, ошибки БД) больше не попадает в публичный лог Actions, файл на сервере 600.
4. Злоупотребления — без изменений.
5. Секреты и логи — предупреждение CORS без значений окружения; CI `web` — только фиктивные тестовые значения
   (`--env-mode=loose` передаёт окружение job в Playwright, секретов в нём нет).
6. Аудит — не затронут.

## 9. Acceptance Criteria
1. `.copier-answers.yml`: `_commit: v0.3.0` после `copier update` без ручной правки; маркеров конфликтов и `.rej` нет.
2. `@rkarakulov/*` 0.3.0 в каталоге и lockfile.
3. `playwright.config.ts`, `e2e/{fixtures,console-errors,urls}.ts` = рендер `v0.3.0`; `turbo.json` = рендер + `ADMIN_BASE`;
   CI `web` — `pnpm e2e:web`; `deploy-dev.yml` → `ci.yml` (`workflow_call`) работает (`actionlint`).
4. `main.ts` = рендер; `configureHttp` — CSRF и CORS с credentials on-bike (тесты).
5. `deploy.sh`: вывод миграций — в файл 600, в лог — код и подсказка.
6. Пустой `CORS_ORIGINS` вне production — одна строка warn; в production и с origin-ами — нет (тест).
7. `pnpm check` EXIT 0; `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 pnpm build:web`; `pnpm e2e:web` и `E2E_API=1 pnpm e2e:web` —
   зелёные; `actionlint` по workflow — чисто.
8. Пользовательские строки — «Покатим»; внутренние имена — on-bike.

## 10. Documentation Impact
`docs/runbooks/local-dev.md` (смоук проекта, `e2e/project.ts`, CI `web`, предупреждение CORS), `docs/runbooks/deploy.md`
(«Логи»: `migrate.log`), `docs/product/` — заметка о бренде.

## 11. Implementation Context
Ветка `feature/template-v0.3.0` от `origin/develop`. Рендер для сравнения — `copier copy --vcs-ref v0.3.0` с
`.copier-answers.yml` on-bike в scratchpad.

## 12. Outcome
**Статус:** реализовано, проверено локально; ветка `feature/template-v0.3.0` запушена, PR не открыт. Бренд — «Покатим»,
внутреннее имя — on-bike (`docs/product/brand.md`).

**Коммиты:** `6a8cb17` copier update `v0.3.0`, пакеты 0.3.0, смоук и CI на точках расширения · `812a27a` деплой: вывод
миграций в `migrate.log` · `cdf60f9` API: предупреждение о пустом `CORS_ORIGINS` · `04ce453` деплой: подсказка `~/…`
без обратного слеша · `3c064e2` бренд «Покатим» · коммит этого task.md.

**copier update.** `uvx copier@9.19.1 update --vcs-ref v0.3.0 --trust --defaults` (git-доступ — учётка keychain): `_commit:
v0.3.0` **сам** (follow-up app-foundation подтверждён), `.rej` нет, 9 конфликтов:
- `.github/workflows/ci.yml` — `check`: `pnpm build` шаблона; `web`: шаблон + у якорей services (PostGIS, Redis, Mailpit),
  env (`E2E_API`, фиктивное окружение API), шаги сборки API и миграций; Playwright — `pnpm e2e:web`. Шапка on-bike
  (`workflow_call`, push только `[main]`, `concurrency` с `github.workflow`) — вне конфликта, сохранена;
- `turbo.json` — шаблон (без `passThroughEnv`) + `ADMIN_BASE` (§8.1);
- `apps/api/src/{main,http-app,http-app.test}.ts` — `main.ts` = шаблон; `http-app.ts` и тест — реализация on-bike (CSRF,
  CORS с credentials), `configureOnBikeHttp` → `configureHttp`;
- `apps/app/{playwright.config.ts,e2e/urls.ts}` — шаблон; `e2e/web.spec.ts` — смоук on-bike на `test`/`expect`/`watchErrors`
  из `fixtures.ts`; новое `e2e/project.ts` — серверы API/worker при `E2E_API=1`, `API_INTERNAL_URL`, 401
  `POST /v1/auth/session/refresh`; `MAILPIT_URL` — в `e2e/mailpit.ts`;
- `docs/runbooks/local-dev.md` — разделы on-bike (dev на `127.0.0.1`, сессия web, Caddy) + «Смоук проекта» и CI `web` шаблона.

Без конфликта, но с потерей: PNG on-bike (§8.2) — возвращены. Пакеты `@rkarakulov/*` 0.3.0 — каталог и lockfile (в
lockfile меняются только версии пакетов базы).

**Проверки** (хвосты):
- `pnpm check` — EXIT 0: prettier ok; depcruise 225 модулей, 0 нарушений; typecheck 8/8; test 13/13 (api 104, app 29
  наборов / 135, contracts 32, api-client 19, design-tokens 114, i18n 6, admin 7, tracks 2).
- TDD п. 6: тест «development + пустой `CORS_ORIGINS`» красный (`expected "Mock" to be called 1 times, but got 0 times`),
  после реализации `http-app.test.ts` 16/16.
- `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 pnpm build:web` — EXIT 0, `Exported: dist`, `sw.js: 35 файлов статики`.
- Смоук (dev-API автора на `:3000` не трогался — API смоука на `:3300`, Redis БД `/5`, окружение — как в CI `web`):
  `EXPO_PUBLIC_API_URL=http://127.0.0.1:3300 pnpm e2e:web` — 7 passed, 1 skipped; с `E2E_API=1` (+ сборка API,
  `db:migrate` dev-БД) — 8 passed; письмо в Mailpit: «…регистрацию в «Покатим»…». Оба прогона — после бренда.
- Маркеры конфликтов (`<<<<<<<`, `>>>>>>>`, `=======` в начале строки) — нет; `.rej` — нет.
- `actionlint` (`rhysd/actionlint:1.7.7`, с shellcheck) — EXIT 0, замечаний нет; `shellcheck` `deploy.sh`
  (`koalaman/shellcheck:v0.10.0`) — EXIT 0; симуляция блока миграций (заглушка compose): успех — код 0, провал — код 3,
  `::error::` с подсказкой `~/…/migrate.log`, вывод только в файле (600).
- NOT VERIFIED: GitHub Actions (CI на PR, `deploy-dev` через `workflow_call`) не запускались — только `actionlint`;
  деплой на сервер не выполнялся.

**Локальные отличия от рендера `v0.3.0`** (скрипт: `copier copy --vcs-ref v0.3.0` с `.copier-answers.yml` on-bike в
scratchpad; `git ls-files` vs рендер, побайтно). Совпадает 161, изменено 64, удалено 5, только в on-bike — 186.
- **Ушли из отличий (были в `v0.2.0`):** `.copier-answers.yml`, `turbo.json` (кроме `ADMIN_BASE`), `apps/api/src/main.ts`,
  `apps/app/playwright.config.ts`, `apps/app/e2e/urls.ts`; новые шаблонные `e2e/{fixtures,console-errors,urls.test,
  console-errors.test}.ts` — без правок.
- **Корень и CI (M):** `.github/workflows/ci.yml` (якоря `web`; `workflow_call` и `concurrency` для деплоя), `turbo.json`
  (`ADMIN_BASE`), `pnpm-workspace.yaml` (Playfair), `README.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`
  (права автора, F5b LOW-4).
- **API (M):** `.env.example`, `package.json`, `app.module.ts`, `worker.module.ts`, `queues.ts`, `config/env{,.test}.ts`,
  `error-messages{,.test}.ts`, `http-app{,.test}.ts` (CSRF, credentials, предупреждение CORS), `test/{test-env.ts,
  harness.int.test.ts}`, `drizzle/meta/{0000_snapshot,_journal}.json`. `test/harness.ts` = рендер (готов к `v0.3.1`).
- **App (M):** `package.json`, `app.json` (бренд, сплэш), `jest.setup.ts`, `e2e/{project,web.spec}.ts`, иконки PWA и
  favicon, `src/app/{_layout,(tabs)/_layout,(tabs)/index}.tsx`, `src/components/screen-placeholder.tsx`, `src/lib/api.ts`,
  `src/theme/{design-system,fonts,fonts.test}.ts`, `src/__tests__/{app-routes.ts,root-layout.test.tsx,tabs.test.tsx,
  ui-kit.test.tsx}`. O: `e2e/mailpit.ts`, онбординг, вкладки, `features/auth/**`, `lib/{api-platform,page-metadata,countdown}`.
- **Admin (M):** `index.html` (бренд), `package.json`, `public/favicon.svg`, `src/App.test.tsx`, `src/fonts.ts`,
  `vite.config.ts` (`ADMIN_BASE`, деплой dev — новое против `v0.2.0`).
- **Пакеты (M):** `api-client/src/index{,.test}.ts`, `contracts/src/{common,common.test,index}.ts`,
  `design-tokens/src/{brand,contrast,index,design-tokens.test}.ts`, `i18n/src/{ru,index.test}.ts`.
- **Docs (M):** `docs/README.md`, `docs/runbooks/local-dev.md`. O: `adr/**`, `architecture/`, `product/` (+ `brand.md`),
  `runbooks/{README,deploy}.md`, `tasks/**`.
- **Infra и деплой (O):** `.dockerignore`, `.github/workflows/deploy-dev.yml`, `infra/{Caddyfile,docker-compose.prod.yml,
  .env.example}`, `infra/deploy/*`, `infra/docker/*`.
- **Удалённые файлы шаблона (N, 5, как в `v0.2.0`):** `docs/adr/0001-stack.md`, `apps/api/drizzle/0000_init.sql`,
  `apps/app/src/app/(tabs)/section.tsx`, `apps/app/src/__tests__/section.test.tsx`, `apps/app/assets/images/splash-icon.png`.

**Follow-ups в app-foundation:** (1) `copier update` заменил бинарные файлы проекта (иконки PWA, favicon) рендером без
конфликта, хотя в шаблоне `v0.2.0..v0.3.0` они не менялись — разобрать (исключение `public/icons/*` или предупреждение в
README «Обновление проекта»); (2) смоук «без API» у проекта с гардом сессии: экраны за гардом — «Нет соединения»;
развилку по `WITH_API` описать в runbook шаблона; (3) `ADMIN_BASE` (админка под подпутём) — поднять в шаблон, если нужен
другим проектам.

### Ревью PR #13 (APPROVE с замечаниями) и merge `develop`
- `git merge origin/develop` (PR #12, Mailpit по `/mail/`): конфликт `infra/deploy/env.template` — обе правки
  (`MAILPIT_UI_PASSWORD=@secret` с комментарием и `MAIL_FROM` «Покатим dev»); `deploy.sh` (smoke `/mail/` + `migrate.log`)
  и runbook деплоя слились сами.
- MEDIUM: новый `MAIL_FROM` не доходил до настроенного сервера — `bootstrap.sh` `migrate_mail_from`: значение, в точности
  равное прежнему умолчанию `'on-bike dev <no-reply@on-bike.by>'`, заменяется текущим из `env.template`; ручное не
  трогается; `MANAGED_KEYS` не менялся. Симуляция (`ON_BIKE_SKIP_NGINX=1`, временный каталог, значения не печатаются):
  старое умолчание → заменено; ручное → не тронуто; новый `.env` → умолчание; повторный прогон каждого — `.env` без
  изменений (`shasum`), права 600. Runbook деплоя «`.env` сервера» — исключение описано.
- LOW: `local-dev.md` — `MAIL_FROM` «Покатим»; `runbooks/README.md` — почта `https://<хост>/mail/` под паролем;
  `brand.md` — `local-dev.md` и автозамена на сервере.
- Проверки: `pnpm check` EXIT 0 (typecheck 8/8, test 13/13); `shellcheck` `deploy.sh` `bootstrap.sh` — EXIT 0; `actionlint`
  — EXIT 0; `bash -n` — ok; симуляция блока миграций на слитом `deploy.sh` — как выше; маркеров конфликта нет.
