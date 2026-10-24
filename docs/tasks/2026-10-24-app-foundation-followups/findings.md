# Findings — app-foundation-followups — pass 1 — reviewer: claude
base: origin/main (54ca2ef)   commits: origin/main...feature/foundation-followups (25d6af9..e6e3a2a, 6 коммитов; working tree чистый)
verdict: APPROVE

Репозиторий: `/Users/romankarakulov/PROJECTS/app-foundation`. Пути находок — от корня этого репозитория.

## Что проверено (evidence)

- **Релиз (D1).** Исходник `changesets/action@a45c4d5` (`src/run.ts`, `src/index.ts`, `src/git.ts` через `gh api`):
  `published`/`publishedPackages` строятся из строк `New tag:` вывода publish **до** и независимо от
  `if (createGithubReleases)`; `git.pushTag` вызывается только внутри этой ветки → с `createGithubReleases: false`
  теги пакетов в origin не пушатся, `published=true` остаётся, `template-release-check`/`template-tag` запускаются.
  `@changesets/cli` 2.31.1 (`tagPublish`): `New tag:` печатается только для успешно опубликованных пакетов,
  `--no-git-tag` убрал бы и строки, и `published` — довод D1 подтверждён. Других потребителей тегов пакетов /
  GitHub Release в `.github/` и `scripts/` нет. `template-tag`: права прежние (`contents: write`), только git;
  аннотированный тег с идентичностью бота, `git describe --tags --always` сверяется до `push`. Повтор: «Re-run failed
  jobs» сохраняет output `published`; сбой `push` — тег не в origin, повтор ставит его заново.
- **test-kit.** `pnpm check` базы — EXIT 0 (временные PG/Redis на 5452/6392, остановлены);
  `pnpm --filter @rkarakulov/test-kit test` — 19/19, `harness.int.test.ts` 8/8. Хук: после
  `configureHttpApp(prefix)`, до `app.init()`, `await`; опционален — старые вызовы не меняются;
  `configureHttpApp` = только `setGlobalPrefix`, повтор из `configureHttp` безвреден.
- **Рендер шаблона** (`copier copy --vcs-ref HEAD`, `pnpm install` с опубликованными `0.2.0`): `pnpm typecheck`
  7/7, `pnpm lint`, `pnpm arch:check` — ок; jest `--selectProjects server` 17/17 (включая `e2e/console-errors.test.ts`);
  `playwright test --list` — 5 тестов только из `web.spec.ts` (`testMatch` отсекает `*.test.ts`);
  `vitest run src/http-app.test.ts` 2/2; `main.ts` без `[[`/`[%` (Jinja не нужна; путь назначения тот же —
  трёхстороннее слияние у проектов не ломается). Смоук без API как в CI (`EXPO_PUBLIC_API_URL` в env,
  `E2E_PORT`/`E2E_DEV_PORT` через loose env turbo) — `pnpm e2e:web` 5 passed.
- **CI шаблона:** `check` — `pnpm build` (у `apps/app` нет `build`, web-экспорт только в `web`); якоря `web` —
  комментарии, YAML не меняется. **CI базы `template-update`:** пока базовый тег (`v0.2.0`) без `project.ts`,
  ветка проверки `project.ts` пропускается (`smoke=""`), заработает с `v0.3.0`.
- **`--env-mode=loose`:** влияет на задачи прогона `e2e:web` (`build:web`, `e2e:web`; обе без кеша). В шаблонном CI
  `web` секретов в env job нет (`NODE_AUTH_TOKEN` — только у шага install); expo встраивает в бандл только
  `EXPO_PUBLIC_*`. Новых путей утечки не вижу; ограничение «секреты в env job `web` не класть» — в runbook/§8.3.
- **Documentation Sync (§10):** README базы («Обновление проекта», «Разработка базы», «Разработка шаблона»,
  `E2E_API` в `--e2e`), runbook и README шаблона, `.claude/rules/app.md.jinja` — обновлены. `AGENTS.md` базы правки не
  требует.

## Findings

### [MEDIUM] Смоук без API ломается локально, если `apps/app/.env` задаёт другой `EXPO_PUBLIC_API_URL`
- **status:** fixed — `f458f1b`: `resolveApiUrl` в `e2e/urls.ts` (env процесса → `EXPO_PUBLIC_API_URL` из `apps/app/.env` через `node:util` `parseEnv`, только эта переменная → умолчание); тест `e2e/urls.test.ts` (jest server, красный `resolveApiUrl is not a function` → 20/20). Рендер: `.env` с `:3999`, `env -u EXPO_PUBLIC_API_URL pnpm e2e:web` без API → 5 passed.
- **file:** template/apps/app/e2e/urls.ts
- **location:** строки 10–14 (`API_URL`); потребитель — template/apps/app/e2e/fixtures.ts:14–24
- **problem:** Допуск «отказ соединения с API без `E2E_API`» строится по `process.env.EXPO_PUBLIC_API_URL ??
  'http://127.0.0.1:3000'`. Но сборка (`expo export`) берёт адрес и из `apps/app/.env`, который runbook теперь велит
  создать до `build:web`; Playwright и turbo `.env` не читают. Комментарий «тот же, что вшит в сборку» не
  гарантирован.
- **why_it_matters:** Разработчик с `.env`, где адрес API другой (LAN-IP для телефона, `localhost`, другой порт), без
  запущенного API получает красный `pnpm e2e:web` на ожидаемом отказе соединения — регрессия против прежнего фильтра,
  ложное падение уводит в отладку не туда. CI не затронут: там адрес задан в env job.
- **evidence:** Рендер HEAD: `apps/app/.env` с `EXPO_PUBLIC_API_URL=http://127.0.0.1:3998`, `env -u EXPO_PUBLIC_API_URL
  pnpm e2e:web` → `2 failed`: `"Failed to load resource: net::ERR_CONNECTION_REFUSED
  (http://127.0.0.1:3998/v1/health)"`. С тем же адресом в env процесса — 5 passed.
- **recommended_fix:** В `urls.ts` при отсутствии `EXPO_PUBLIC_API_URL` в env читать только эту переменную из
  `apps/app/.env` (`node:util` `parseEnv` + `existsSync`; не `process.loadEnvFile` целиком — иначе `PORT`/`HOST` из
  `.env` попадут в серверы смоука), затем умолчание. Либо явно указать в runbook, что `pnpm e2e:web` берёт адрес
  только из env процесса.

### [LOW] Комментарий и название теста `configureHttp` утверждают, что её вызывает стенд — в `v0.3.0` это не так
- **status:** fixed — `045890a` (PR 1: «HTTP-настройка API до `app.init()` (`main.ts`)», тест «HTTP-настройка main.ts»); ветка `-harness`: merge `3409d8e` + `a626a63` — формулировка со стендом возвращена.
- **file:** template/apps/api/src/http-app.ts.jinja; template/apps/api/src/http-app.test.ts.jinja
- **location:** http-app.ts.jinja:8; http-app.test.ts.jinja:43
- **problem:** «одна для `main.ts` и стенда тестов (`test/harness.ts`)», `describe('configureHttp (main.ts и стенд
  тестов)')` — но `test/harness.ts.jinja` в этом PR `configureApp` не передаёт (по §8.2 — PR 2, `0.3.1`).
- **why_it_matters:** Проект, обновившийся до `0.3.0`, по комментарию считает, что int-тесты идут с CORS/CSRF из
  `configureHttp`, и пишет на это тесты или правки — а стенд их не применяет.
- **evidence:** `template/apps/api/test/harness.ts.jinja` — `createApiHarness({ apiModule, workerModule, env,
  httpPrefix: API_VERSION, schema })`, без `configureApp`.
- **recommended_fix:** В PR 1 — «для `main.ts`; стенд тестов — с `0.3.1`» (или без упоминания стенда), в PR 2 —
  нынешняя формулировка. Либо выпустить PR 2 сразу после `0.3.0` и отметить это в CHANGELOG.

### [LOW] Ошибка `configureApp` оставляет открытыми приложение и соединения стенда
- **status:** fixed — `d822f99`: try/catch вокруг хука, `init()` и `ready()`, `app.close()` и проброс исходной ошибки; тест «хук бросает» (красный `expected [] to deeply equal [ 'api' ]` → test-kit 20/20).
- **file:** packages/test-kit/src/harness.ts
- **location:** строки 105–107
- **problem:** Если хук (или `init()`) бросает, `app` (граф Nest с пулом БД и Redis из модулей проекта) не
  закрывается: вызывающий не получил `ApiHarness` и не может вызвать `close()`.
- **why_it_matters:** Ошибка в HTTP-настройке проекта в `beforeAll` даёт вместо понятного падения висящий воркер
  vitest или таймаут закрытия. Для `init()` так было и раньше, хук добавляет новый источник исключений
  (пользовательский код).
- **evidence:** `configureHttpApp(app, …); await configureApp?.(app); await app.init();` — без try/catch.
- **recommended_fix:** `try { await configureApp?.(app); await app.init(); … } catch (e) { await app.close().catch(() =>
  {}); throw e; }` и тест: хук бросает → `createApiHarness` отклоняется с этой ошибкой.

### [LOW] Набор экспортов `e2e/project.ts` стал контрактом с проектами, но в списке контрактов его нет
- **status:** fixed — `045890a`: README «Разработка шаблона» — экспорты `project.ts` и их типы — контракт, новые — только необязательные.
- **file:** README.md
- **location:** строки 209–213 («Разработка шаблона»: `_skip_if_exists`, «контракт с проектами»)
- **problem:** `playwright.config.ts` и `fixtures.ts` (обновляются) импортируют именованные `servers`, `webServerEnv`,
  `expectedResourceErrors` из `project.ts` (не обновляется). Новый обязательный экспорт или смена типа в шаблоне
  ломает typecheck и смоук существующих проектов после `copier update`. README говорит только о «новых значениях по
  умолчанию — в CHANGELOG».
- **why_it_matters:** Следующая правка точки расширения в шаблоне легко сломает все проекты, и CI базы
  (`template-update` сравнивает файлы, сборку не запускает) этого не поймает.
- **evidence:** `template/apps/app/playwright.config.ts:3` `import { servers, webServerEnv } from './e2e/project'`;
  `template/apps/app/e2e/fixtures.ts:4` `import { expectedResourceErrors } from './project'`; copier.yml `_skip_if_exists`.
- **recommended_fix:** Добавить в пункт «контракт с проектами» README (и/или AGENTS.md базы, правило 8–9): имена и
  типы экспортов `apps/app/e2e/project.ts` — контракт; новые экспорты — только необязательные (`import * as project`
  с умолчаниями в `fixtures.ts`/`playwright.config.ts`).

## NOT VERIFIED
- GitHub Actions (`release.yml`, `ci.yml`) не запускались; `actionlint` не прогонялся. Поведение `changesets/action`
  проверено по исходнику закреплённого SHA, не прогоном.
- `copier update` с сохранением `project.ts` (`_skip_if_exists`) не повторён независимо: симуляцию с локальными
  тегами в клоне не дали запустить права песочницы. Опираюсь на симуляцию автора (§12) и на то, что job
  `template-update` начнёт её проверять с базового тега `v0.3.0`.
- Полный `pnpm template:check` (`--e2e`, `use_postgis=true`) не запускался: занятые порты 5432/6379 (dev-инфраструктура
  on-bike). Вместо него — частичные проверки рендера выше.
- Сценарий «Re-run all jobs» после успешной публикации: `published=false` (версии уже в реестре) → тег `vX.Y.Z` не
  ставится. Так было и до изменения; восстановление — «Re-run failed jobs». Не находка этого diff.
