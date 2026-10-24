# App-foundation: follow-ups F3/F5a/F5b (релизный тег, хук стенда, точки расширения смоука)

## 1. Title
База app-foundation: `_commit = vX.Y.Z` после `copier update`, хук `configureApp` в `createApiHarness`, runbook
web-сборки, точки расширения смоука web для проектов, CI шаблона собирает все приложения.

## 2. Goal
Проект на шаблоне (on-bike) получает изменения базы `copier update` без локальных расхождений там, где их
вызывали пробелы шаблона: версия шаблона в `.copier-answers.yml` — тег `vX.Y.Z`; int-тесты API идут с HTTP-настройкой
проекта; смоук web расширяется проектным файлом, а не правкой `playwright.config.ts`/`turbo.json`/CI шаблона.
Источник требований — follow-ups F5b (`docs/tasks/2026-10-23-onbike-web/task.md`, «Follow-ups в app-foundation»,
п. 1–3, 5) и решения on-bike: `apps/app/{playwright.config.ts,e2e/web.spec.ts}`, `turbo.json`,
`.github/workflows/ci.yml`, `apps/api/src/http-app.ts`.

## 3. Scope
1. **Релизный тег.** После `copier update` `_commit` = `vX.Y.Z`, а не тег пакета. Старые теги не удаляются.
2. **`createApiHarness({ configureApp })`** (`@rkarakulov/test-kit`): опциональный колбэк `(app) => void | Promise<void>`
   до `app.init()`; тест в `harness.int.test.ts` (TDD). Шаблон API: HTTP-настройка из `main.ts` — в функцию
   `configureHttp` (`src/http-app.ts`, без смены поведения), стенд API шаблона вызывает её через хук.
   Changeset minor test-kit (fixed-группа → `0.3.0`).
3. **Runbook шаблона:** `apps/app/.env` создаётся до `pnpm build:web`; README шаблона — так же.
4. **Точки расширения смоука web** (`playwright.config.ts`, `e2e/`, `turbo.json`, CI `web`) — §8.1, D4.
5. **CI шаблона:** job `check` собирает все приложения и пакеты (`pnpm build`), web-экспорт — только в job `web`.

## 4. Out of Scope
CORS `credentials` и CSRF в шаблоне (F6, identity), генератор иконок PWA, identity/админка, перенос on-bike на `0.3.0`
(отдельная задача on-bike после релиза), GitHub Release для `vX.Y.Z`.

## 5. Architecture Context
- Релиз базы — `.github/workflows/release.yml`: `changesets/action@v1.9.0` (`a45c4d5`) → `pnpm release`
  (`changeset publish`, `@changesets/cli` 2.31.1) → `template-release-check` (`--strict --e2e`) → `template-tag`
  (`git tag vX.Y.Z`). copier берёт версию шаблона `git describe --tags --always` (`copier/_template.py`).
- `@rkarakulov/test-kit` `createApiHarness` — Nest `TestingModule` + Fastify, `configureHttpApp(app, { prefix })` (только
  `setGlobalPrefix`, повторный вызов безвреден), затем `app.init()`.
- Смоук web шаблона — Playwright (`apps/app/playwright.config.ts`, `e2e/{web.spec,urls}.ts`), `pnpm e2e:web` = turbo
  `e2e:web` (strict env, `passThroughEnv`), CI job `web` без API.

## 5.1 Placement & Reuse Gate
- Хук — в test-kit (общий стенд), функция HTTP-настройки — в API шаблона (проект расширяет её у себя).
- Расширение смоука — файлы `apps/app/e2e/*` шаблона; проектное — один файл, который `copier update` не трогает.
- Без новых пакетов и зависимостей.

## 6. Relevant Files
app-foundation: `.github/workflows/{release,ci}.yml`, `README.md`, `packages/test-kit/src/{harness,harness.int.test}.ts`,
`.changeset/*`, `copier.yml`, `scripts/check-template.mjs`, `template/apps/api/{src/main.ts.jinja,src/http-app.ts.jinja,
test/harness.ts.jinja,test/harness.int.test.ts.jinja}`, `template/apps/app/{playwright.config.ts,jest.config.js.jinja,e2e/*}`,
`template/{turbo.json,package.json.jinja,.github/workflows/ci.yml.jinja,docs/runbooks/local-dev.md.jinja,README.md.jinja}`.

## 7. Implementation Notes
- TDD: test-kit хук, `configureHttp` шаблона, сопоставление ожидаемых ошибок консоли — сначала красный тест.
- Документацию библиотек сверять по установленным версиям/исходникам (context7 недоступен).

## 8. Risks / Assumptions / Open Questions
- Шаблон в PR проверяется с последними **опубликованными** пакетами (`0.2.0`): шаблон, вызывающий `configureApp`, в
  PR не соберётся (typecheck) — README базы: «Шаблон, которому нужна ещё не выпущенная функция пакета, — отдельным
  PR после релиза». Решение — §8.2.

## 8.1 Requirements Consistency (решения)
- **D1. Корень `_commit`.** changesets ставит **аннотированные** теги пакетов (`git tag <name> -m <name>`), `template-tag`
  — **лёгкий** `vX.Y.Z` на тот же коммит; `git describe --tags` при точном совпадении предпочитает аннотированный тег
  (среди аннотированных — более поздний) → `@rkarakulov/api-client-core@0.2.0`. Теги пакетов попадают в origin только
  через `createGithubReleases` changesets/action (`git.pushTag` + GitHub Release на каждый пакет).
  Решение: `createGithubReleases: false` (теги пакетов остаются в раннере, GitHub Release пакетов больше не создаются;
  история — `CHANGELOG.md` и реестр); `vX.Y.Z` — аннотированный (`git tag -a`), до `push` — проверка
  `git describe --tags --always` = `vX.Y.Z`. `changeset publish --no-git-tag` **не** берём: changesets/action
  определяет `published` по строкам `New tag:` вывода publish — без тегов `published=false`, и
  `template-release-check`/`template-tag` не запустились бы. Старые теги не трогаются: проекты на `≤ 0.2.0` видят
  тег пакета до следующего `copier update`.
- **D2. Хук стенда.** `configureApp?: (app: NestFastifyApplication) => unknown` (§8.2) — после
  `configureHttpApp(prefix)` и до `app.init()`, ожидается (`await`). `httpPrefix` остаётся обязательным (проект без
  хука не меняется). Шаблон: `src/http-app.ts` — `configureHttp(app, env)` (префикс + CORS из `main.ts`), `main.ts` и
  стенд вызывают её.
- **D3. Runbook:** «Production-сборка» — `cp apps/app/.env.example apps/app/.env` → `pnpm build:web` → `start:web`;
  таблица README шаблона — так же.
- **D4. Точки расширения смоука.**
  (а) Ошибки страницы — фикстура `e2e/fixtures.ts` шаблона (`test`, `expect`; авто-фикстура следит за `pageerror`
  и `console.error` production-сборки, `watchErrors(page)` — для доп. вкладок). Ошибки загрузки ресурса
  (`Failed to load resource: …`) допустимы только из списка «URL + HTTP-статус или `net::ERR_*`» (`e2e/console-errors.ts`,
  чистая функция с unit-тестом). База шаблона: отказ соединения с API (`EXPO_PUBLIC_API_URL`) — только без API
  (`E2E_API` ≠ `1`); любой HTTP-отказ — падение.
  (б) Проектный файл `apps/app/e2e/project.ts` — в `_skip_if_exists` (`copier update` не перезаписывает, новый проект
  получает пустые значения): `servers` (доп. `webServer` до web-серверов: API/worker при `E2E_API=1`), `webServerEnv`
  (env web-серверов смоука, например `API_INTERNAL_URL`), `expectedResourceErrors` (п. а). `playwright.config.ts`,
  `fixtures.ts`, `urls.ts` (+ `API_URL`, `WITH_API`) — шаблонные.
  (в) `pnpm e2e:web` = `turbo run e2e:web --env-mode=loose`: окружение смоука (env серверов проекта, `E2E_*`) проходит
  в Playwright и его `webServer` без списка в `turbo.json`; `passThroughEnv` у `e2e:web` убран (`build:web` и `e2e:web`
  без кеша — хеш не важен). Общее имя флага «API доступен смоуку» — `E2E_API=1`; `template:check --e2e` (API поднят)
  передаёт его.
  (г) CI job `web` шаблона: якорные комментарии — где проект добавляет `services`, `env` и шаги подготовки серверов
  смоука (сборка API, миграции); Playwright — через `pnpm e2e:web` (с loose env обход turbo не нужен).
- **D5. CI `check` шаблона:** `pnpm build` (= `turbo run build`: api, admin, пакеты; у `apps/app` нет `build`, его
  web-экспорт — job `web`), затем загрузка `dist` API.

## 8.2 Deviations from spec
- **Двухфазная поставка п. 2 (по правилу README базы).** PR 1 (`feature/foundation-followups`): test-kit `configureApp`,
  `configureHttp` в API шаблона (`main.ts` через неё), п. 1, 3, 4, 5 → релиз `0.3.0`, тег `v0.3.0`. PR 2
  (`feature/foundation-followups-harness`, от PR 1; открывать **после** публикации `0.3.0`): стенд API шаблона
  передаёт `configureApp: (app) => configureHttp(app, env)` + int-тест CORS через стенд, changeset patch → `0.3.1`.
  Причина: `template:check` в PR ставит опубликованные `@rkarakulov/*@0.2.0` — без `configureApp` typecheck рендера
  красный. Проверка PR 2 до публикации — локальный рендер с test-kit из tarball ветки (§12). Альтернатива — режим
  `template:check` с пакетами из workspace (pack + overrides) — снимает ограничение, но меняет CI базы; не взят.
- **Тип хука — `(app) => unknown`, а не `void | Promise<void>`** (`e6e3a2a`). Функции HTTP-настройки проектов
  возвращают приложение (`configureHttp` шаблона, `configureOnBikeHttp`); с `void | Promise<void>` стенд шаблона
  `configureApp: (app) => configureHttp(app, env)` не типизировался (TS2322, найдено проверкой PR 2). Результат
  по-прежнему ожидается (`await`), значение не используется.
- **Runbook (п. 3), уточнение формулировки.** `expo export` без `EXPO_PUBLIC_API_URL` в шаблоне **не падает**
  (проверено: exit 0), но клиентский бандл бросает `EXPO_PUBLIC_API_URL не задан для сборки` при загрузке страницы
  (строка в `__common-*.js`). Runbook говорит именно это.

## 8.3 Security checklist
Затронуты релизный workflow и права токена. `release`: права не меняются (`contents: write` нужен changesets для PR
релиза); `createGithubReleases: false` убирает запись тегов/релизов пакетов. `template-tag`: только git, тот же
`contents: write`, идентичность git для аннотированного тега — бот `github-actions[bot]`, без новых секретов. CI шаблона:
секреты не добавляются; окружение смоука в CI — фиктивные несекретные значения (как в on-bike). `--env-mode=loose`
передаёт Playwright всё окружение процесса — секреты в env job `web` не кладутся (только тестовые значения).

## 9. Acceptance Criteria
1. Рендер/`copier update` с локального клона, где на коммите релиза только `vX.Y.Z` (и вариант: аннотированные теги
   пакетов + аннотированный `vX.Y.Z` позже) → `_commit: vX.Y.Z`; контроль (лёгкий `v` + аннотированные пакеты)
   воспроизводит баг.
2. `createApiHarness({ configureApp })`: хук получает приложение стенда до `init()`, async-хук ожидается; без хука —
   поведение прежнее (тест test-kit). `configureHttp` шаблона: префикс `v1`, CORS только для `CORS_ORIGINS` (unit-тест).
3. Runbook и README шаблона: `.env` приложения — до `build:web`.
4. Смоук шаблона: HTTP-отказ ресурса вне списка — падение; отказ соединения с API — только без `E2E_API`; проект
   добавляет серверы/env/ожидаемые ошибки в `e2e/project.ts`, который `copier update` сохраняет (проверка
   `template-update`).
5. CI шаблона: `check` — `pnpm build`; `web` — `pnpm e2e:web` с якорями для проекта.
6. `pnpm check`, `pnpm template:check` (оба `use_postgis`, `--e2e`) — зелёные; changeset есть.

## 10. Documentation Impact
README базы («Обновление проекта» — `_commit`, «Разработка базы» — релиз без GitHub Release пакетов, «Разработка
шаблона» — `_skip_if_exists`, `E2E_API` в `--e2e`); runbook и README шаблона (web-сборка, смоук проекта, CI);
`AGENTS.md` базы §3 — при необходимости.

## 11. Implementation Context
Репозиторий — `app-foundation`, ветка `feature/foundation-followups` от `main` (`54ca2ef`, `v0.2.0`).

### FILES TO CREATE / MODIFY
- `.github/workflows/release.yml` — `createGithubReleases: false`; `template-tag`: `git tag -a`, проверка `describe`.
- `packages/test-kit/src/harness.ts` (+ `harness.int.test.ts`) — `configureApp`.
- `.changeset/foundation-followups.md` — test-kit minor + описание шаблона/релиза.
- `template/apps/api/src/http-app.ts.jinja` + `http-app.test.ts` — новые; `main.ts.jinja` — через `configureHttp`.
- `template/apps/app/e2e/{console-errors.ts,console-errors.test.ts,fixtures.ts,project.ts}` — новые; `urls.ts`,
  `web.spec.ts`, `playwright.config.ts` (`testMatch: *.spec.ts`), `jest.config.js.jinja` (проект `server` + `e2e/`).
- `copier.yml` — `_skip_if_exists` + `apps/app/e2e/project.ts`.
- `template/turbo.json`, `template/package.json.jinja` (`--env-mode=loose`), `template/.github/workflows/ci.yml.jinja`.
- `template/docs/runbooks/local-dev.md.jinja`, `template/README.md.jinja`, `README.md`.
- `scripts/check-template.mjs` — `E2E_API=1` в `--e2e`.
- PR 2: `template/apps/api/test/{harness.ts.jinja,harness.int.test.ts.jinja}`, changeset patch.

### TESTS / CHECKS
`pnpm --filter @rkarakulov/test-kit test`, `pnpm check`, `pnpm template:check -- --e2e`,
`pnpm template:check -- --data use_postgis=true`, e2e рендера без API, симуляция тегов + `copier copy/update`.

## 12. Outcome
**Статус:** реализовано, проверено локально; не запушено, PR не открыт (оркестратор).

**Коммиты app-foundation** (ветка `feature/foundation-followups` от `54ca2ef` — PR 1, релиз `0.3.0`):
`25d6af9` test-kit `configureApp` + changeset minor · `41053e6` релиз: аннотированный `vX.Y.Z`,
`createGithubReleases: false`, проверка `describe` · `78ab188` API шаблона: `configureHttp` (`src/http-app.ts`) ·
`aee4bf4` runbook/README: `.env` до `build:web`; CI `check` — `pnpm build` · `4db22e8` точки расширения смоука ·
`e6e3a2a` тип хука `unknown`.
Ветка `feature/foundation-followups-harness` (= PR 1 + `c15d7b6`): стенд API шаблона через `configureApp`,
changeset patch — **открывать после публикации `0.3.0`** (§8.2).

**Проверки** (локально; PG/Redis — отдельные контейнеры на 5442/5443/6390, on-bike не тронут; остановлены):
- AC1: локальный клон + `copier@9.19.1`: `copy v0.2.0` → `_commit: '@rkarakulov/api-client-core@0.2.0'` (баг
  воспроизведён); `update → v0.3.0` (только аннотированный `v`) → `_commit: v0.3.0`; аннотированные теги пакетов +
  позже аннотированный `v0.3.1` → `v0.3.1`; контроль (лёгкий `v0.3.2`) → `@rkarakulov/api-client-core@0.3.2`.
  Фрагмент `template-tag` (tag -a + проверка describe) — «describe ok» в сценариях A/B.
- AC2: test-kit `harness.int.test.ts` — красный до реализации (`expected false to be true`), затем 8/8;
  шаблон `http-app.test.ts` — красный (`Cannot find module './http-app'`), затем 2/2; PR 2 — int-тест стенда красный
  (`expected undefined to be 'http://127.0.0.1:8081'`), с test-kit ветки (tarball) — зелёный, `pnpm check` рендера
  EXIT 0; с опубликованным `0.2.0` — TS2353 (`configureApp` нет) — причина двух PR.
- AC4: jest `e2e/console-errors.test.ts` — красный, затем 4/4. Рендер без API: `pnpm e2e:web` — 5 passed;
  `E2E_API=1` без API — 2 failed (`net::ERR_CONNECTION_REFUSED (…/v1/health)`); API-заглушка с 500 — 1 failed
  (`status of 500 (…/v1/health)`): старый фильтр пропустил бы оба. Симуляция job `template-update` (тег с
  `project.ts` → HEAD с правкой `project.ts` шаблона): exit 0, правка проекта сохранена; без `_skip_if_exists` —
  конфликт (`leftover conflict marker`), job падает.
- AC6: база `pnpm check` EXIT 0 (typecheck 7/7, test 12/12), `pnpm build && pnpm smoke` EXIT 0;
  `pnpm template:check -- --e2e` — ✓ (e2e 5 passed); `pnpm template:check -- --data use_postgis=true` — ✓ со второго
  прогона (первый: таймаут 5 с jest `status.test.tsx` при load average 26, файл не менялся). YAML workflow — pyyaml ок,
  `bash -n` шагов — ок.
- NOT VERIFIED: GitHub Actions (CI/release) не запускались — `createGithubReleases: false` и `git tag -a` проверены по
  исходникам `changesets/action@a45c4d5` и локальной симуляцией; `actionlint` не установлен.

**Для on-bike после `copier update` до `0.3.0` / `0.3.1`:** `_commit` → `v0.3.x`; `playwright.config.ts`, `turbo.json`
— как в шаблоне (серверы API/worker и `API_INTERNAL_URL` → `e2e/project.ts`; `passThroughEnv` не нужен);
`web.spec.ts` — `test`/`expect`/`watchErrors` из `e2e/fixtures.ts`, 401 refresh → `expectedResourceErrors`;
`urls.ts` — шаблонный (`MAILPIT_URL` → `e2e/mailpit.ts`); CI `check` — `pnpm build` шаблона; CI `web` — services/env/
шаги у якорей, Playwright через `pnpm e2e:web` (обход turbo не нужен); `apps/api/src/http-app.ts` — конфликт
«добавлен с обеих сторон»: оставить реализацию on-bike (CSRF, credentials), имя — `configureHttp`, тогда `main.ts`
= шаблон; с `0.3.1` `test/harness.ts` = шаблон, int-тесты идут с CSRF/CORS on-bike.
