# F3b: on-bike принимает шаблон app-foundation `v0.1.2`

## 1. Title
on-bike — проект шаблона app-foundation: `.copier-answers.yml`, общие файлы из шаблона, Claude — плагин `app-dev-kit`.

## 2. Goal
С этого момента on-bike получает изменения каркаса (CI, конфиги, AI-инфраструктура, тестовые/инфра-заготовки) через
`copier update`, а процесс разработки для Claude — через плагин `app-dev-kit`, а не копиями в репозитории. Поведение
продукта не меняется. Дизайн: `docs/tasks/2026-10-22-app-foundation/design.md` §3–§4 (F3b); ADR-0004. Решение человека:
работать автономно (2026-10-22).

## 3. Scope
- **Ответы шаблона** — `.copier-answers.yml` с `_commit: v0.1.2`, `_src_path: gh:rkarakulov/app-foundation` и ответами
  on-bike: `project_slug: on-bike`, `project_name: on-bike`, `npm_scope: on-bike`, `app_scheme: onbike`,
  `bundle_id: by.onbike.app`, `author: Roman Karakulov`, `use_postgis: true`.
- **Структура как в шаблоне:** `apps/mobile` → `apps/app` (имя пакета `@on-bike/app`; ADR-0003 — одно универсальное
  приложение), все ссылки (turbo/CI/eslint/depcruise/rules/AGENTS/docs/EAS-скрипты) — на новый путь.
- **Общие файлы — из рендера шаблона** (рендер `v0.1.2` с ответами on-bike, файл за файлом): корень (`eslint.config.mjs`
  на `createEslintConfig`, prettier, depcruise, turbo, `.gitignore`, `.npmrc`, `.nvmrc`, хуки), `.github/workflows/ci.yml`,
  `infra/docker-compose.dev.yml`, `tools/ai_review/*`, `.ai/dev-kit/**`, `.agents/skills/*`, `.codex/**`,
  `.claude/settings.json` (deny-лист + плагин app-dev-kit и superpowers). Где у on-bike есть продуктовые отличия
  (домен, PostGIS, landing до F5, identity, tracks, Mailpit-настройки, EAS) — сохраняются как локальные правки поверх
  шаблона; каждое отличие перечислено в §12.
- **AI-инфраструктура Claude — плагин:** удалить `.claude/{commands,agents,skills,hooks}`, `.claude/ai-runtime.md`,
  `.claude/task-template.md`, `.claude/architecture-review-template.md` (тексты теперь в плагине и в `.ai/dev-kit`);
  `.claude/rules/*` — общие из шаблона + доменные правила on-bike (MVP-рамки, треки, PostGIS, «Протокол»),
  `AGENTS.md` — разделы шаблона §0–§10 с доменным содержанием on-bike; `CLAUDE.md` — по шаблону + навигация on-bike.
- **`@on-bike/config` удаляется** — tsconfig/eslint/prettier из `@rkarakulov/config` (отложено из F4).

## 4. Out of Scope
- web/PWA/SSR приложения и удаление Astro-лендинга — F5 (landing остаётся как есть, вне шаблона).
- Identity и админка с ролями — F6; перевод API на ESM — отдельная задача.
- Изменения в шаблоне базы: если для on-bike нужна общая правка — задача в app-foundation, не правка локально.

## 5. Architecture Context
copier update делает трёхстороннее слияние: база — рендер `_commit`, «их» — новый тег, «наши» — файлы проекта. Поэтому
после F3b рендер `v0.1.2` + локальные правки on-bike = текущее состояние репозитория; чем меньше расхождений в общих
файлах, тем чище будущие обновления.

## 5.1 Placement & Reuse Gate
- Общие файлы — копии рендера шаблона без правок, кроме обоснованных продуктовых отличий (перечень в §12).
- Тексты процесса — только в плагине/`.ai/dev-kit`; дублей в `.claude/` не остаётся.

## 6. Relevant Files
- app-foundation `template/**`, `copier.yml` (тег `v0.1.2`); on-bike: корень, `apps/mobile` → `apps/app`, `.claude/**`,
  `.agents/**`, `.codex/**`, `tools/ai_review/**`, `AGENTS.md`, `CLAUDE.md`, `infra/`, `.github/workflows/ci.yml`,
  `packages/config`, `docs/runbooks/local-dev.md`.

## 7. Implementation Notes
- Рендер: `uvx copier@9.19.1 copy --vcs-ref v0.1.2 --data-file <answers> gh:rkarakulov/app-foundation <tmp>` (приватный
  репозиторий — git-учётные данные `gh`). Сравнение `diff -r` рендера с on-bike.
- `git mv apps/mobile apps/app` — сохранить историю.
- Expo: `name/slug/scheme/bundle` on-bike не меняются; EAS-профили и скрипты сборки — путь `apps/app`.

## 8. Risks / Assumptions / Open Questions
- Переименование `apps/mobile` затрагивает CI, EAS, Metro-кеш и пути в документах — ловится `pnpm check`, `expo export`,
  поиском старого пути.
- Codex в on-bike переходит на `.ai/dev-kit` — проверить, что адаптеры видны (`codex debug prompt-input`).
- Плагин app-dev-kit у человека ещё не установлен — Claude-команды `/develop-task` в on-bike будут доступны после
  установки плагина (`.claude/settings.json` предложит его при открытии проекта).

## 8.1 Requirements Consistency
Architect, 2026-10-23. Проверено рендером `v0.1.2` с ответами §3 (`copier@9.19.1`, локальный клон базы) и `diff -r`
с on-bike; поведение `copier update` проверено на тестовом теге в клоне базы (см. R3). Статус: **CONCERNS**, блокеров нет.

- **R1 (MEDIUM) Имя dev-БД.** `db_name` шаблона вычисляемый (`when: false`, в ответы не пишется) = `on_bike`; в on-bike —
  `onbike` в 6 местах (`infra/docker-compose.dev.yml`, `ci.yml`, `apps/api/.env.example`, `drizzle.config.ts`,
  `test/test-env.ts`, комментарий `vitest.config.mts`) + runbook. Варианты: **A** — перейти на `on_bike` в dev/CI/тестах
  (файлы = рендер; прод не затронут — `docker-compose.prod.yml` вне шаблона). Существующий том `pgdata` создан с
  ролью `onbike`: не пересоздавать его, а добавить роль и БД (`CREATE ROLE on_bike LOGIN SUPERUSER PASSWORD 'on_bike';
  CREATE DATABASE on_bike OWNER on_bike;`, затем `db:migrate`), либо оставить личный `apps/api/.env`; удаление тома —
  только с человеком (`docker compose down -v` в deny). **B** — оставить `onbike` локальной правкой (6 файлов, конфликт
  при каждой правке шаблона в блоке services CI/compose). **C** — сделать `db_name` вопросом в `copier.yml` (задача и
  тег в app-foundation до F3b). **Рекомендация: A** (шаг runbook «переход существующего тома»).
- **R2 (LOW) `_commit` и `_src_path`.** Рендер пишет `_commit: '@rkarakulov/api-client-core@0.1.2'` (`git describe`
  выбирает тег пакета на том же коммите) и локальный `_src_path`. AC1 требует `v0.1.2`: правка руками безопасна —
  проверено: update с `_commit: v0.1.2` на тестовый тег проходит. Итог: `_commit: v0.1.2`,
  `_src_path: gh:rkarakulov/app-foundation`, остальные ключи — как в рендере (сортировка copier).
- **R3 (MEDIUM) AC1 недоопределён.** `copier update` на ту же версию — no-op по построению (проверено: «Keeping template
  version», `git status` пуст) и ничего не доказывает. Заменить AC1 на три проверки: (а) скриптовый `diff -r` рендера
  `v0.1.2` с on-bike = ровно перечень §12; (б) update на ту же версию — пустой `git status`; (в) update клона on-bike
  на тестовый тег `v0.1.3` (клон базы в scratchpad с безобидными правками шаблона) применяет только тестовые куски,
  без `*.rej` и маркеров. Наблюдения эксперимента: правка frontmatter в `.claude/rules/security.md` сливается с правкой
  шаблона в теле чисто; соседние строки (конец `local-dev.md`) — маркеры `<<<<<<< before updating` (ожидаемо);
  **файл, удалённый в проекте** (`docs/adr/0001-stack.md`, `0000_init.sql`) остаётся удалённым, а правка шаблона в нём
  **молча теряется** — в §12 перечислить удалённые файлы шаблона отдельным списком.
- **R4 (MEDIUM) Доменное содержимое процесса.** Удаляемые `.claude/skills|commands|agents` on-bike содержат домен, которого
  нет в плагине: mobile-expo §0/§2 (рамки MVP, MapLibre, импорт файла с pre-check `@on-bike/tracks`, resumable upload,
  шеринг, геолокация, удаление аккаунта), web-ui §2–§3 («Протокол», landing/OG), backend-nest (tracks, GIST, dead-letter
  → панель, лимиты Skia/ffmpeg, фикстуры FIT/GPX/TCX), verify-task (build admin/landing, EAS не запускать), а правила
  `mobile.md`/`web.md`/`backend.md`/`db.md`/`security.md`/`tests.md`/`contracts.md` — доменные строки. Варианты:
  **A** — правила шаблона байт-в-байт + доменные файлы `.claude/rules/onbike-*.md` с теми же `paths:` (чистые update);
  **B** — домен внутри файлов шаблона (трёхстороннее слияние на каждую правку шаблона); **C** — домен только в
  AGENTS.md (теряется привязка к путям). **Рекомендация: A.** Перенос — построчно, с чек-листом «строка → файл».
- **R5 (LOW) Нумерация инвариантов.** У шаблона другой порядок §4 (append-only — §4.10, contracts-first — §4.2 …), плагин
  опирается на номера разделов. Принять порядок шаблона; ссылки в коде/доках есть только на §4.11–§4.13 (номера
  совпадают), CRITICAL-диапазон §4.1–§4.10 в `review_contract.md` тот же. Доменные правки AGENTS.md: §1, §2, §3,
  тексты §4.1 (треки), §4.7 (Europe/Minsk), §4.9 (примеры), §4.10 (on-bike ведёт аудит — перечень), §4.13 (ADR-0003),
  §8, §9 — ожидаемые локальные отличия (CI шаблона проверяет слияние AGENTS.md).
- **R6 (MEDIUM) CI слабеет при взятии «как есть».** Рендер собирает только `@on-bike/api`; сейчас on-bike собирает всё
  (`turbo run … build`: admin, landing, пакеты). Варианты: **A** — одна локальная строка `pnpm turbo run build` (всё) +
  задача в app-foundation сделать так же в шаблоне; **B** — принять (сборка admin/landing не проверяется); **C** —
  отдельный job. **Рекомендация: A.** Также у job `secrets` появляется `permissions: pull-requests: read` (gitleaks на
  PR), actions закреплены по SHA, фильтр turbo по PR уходит (полный `pnpm check` на каждом PR) — **§8.3 «те же права»
  неточен**: автору поправить (+read-право, SHA — усиление).
- **R7 (MEDIUM) Astro до F5.** `.prettierrc.json` шаблона — строка `"@rkarakulov/config/prettier"`, к ней нельзя добавить
  `prettier-plugin-astro`: при взятии как есть `.astro` выпадают из `format:check`. Оставить JSON on-bike (опции = пресет
  + плагин astro) локальной правкой «до F5»; так же `.astro` в `.gitignore`/`.prettierignore`/depcruise exclude/eslint
  ignores, `landing` в `designSystemOnly`, `prettier-plugin-astro` в catalog и корневом `package.json`.
- **R8 (LOW) Подъём `@rkarakulov/*` 0.1.1 → 0.1.2** неявно входит в scope (каталог из шаблона) + новый
  `@rkarakulov/config`. Проверено: в коде пакетов между `@…@0.1.1` и `v0.1.2` изменений нет (только версии/CHANGELOG).
  Отметить в pr.md.
- **R9 (MEDIUM) Выравнивание продуктовых пакетов.** Чтобы update были чистыми, выровнять механически (без смены
  поведения): design-tokens — `primitives.ts` + `themes.ts` → `brand.ts`, тема `protocol` → `panel` (CSS тот же),
  экспорт как в шаблоне (`AppTheme`, `Theme`), `color` из индекса не экспортировать (вне пакета не используется) — тогда
  `paletteModules` пресета ESLint равен нынешней защите on-bike; `ON_BIKE_ERROR_MESSAGES` → `PROJECT_ERROR_MESSAGES`.
  Альтернатива — оставить структуру и добавить запрет `color` локальной правкой eslint (больше расхождений). Admin
  `App.tsx` шаблона показывает статус API словарём (`apiStatus.ok/degraded`), on-bike — сырой `ok` (дефект i18n):
  **рекомендация** взять из рендера + ключи в `ru.ts` — видимая мелочь в админке, отметить в §12/pr.md.
- **R10 (LOW) TZ jest.** Шаблон `Asia/Tbilisi`, on-bike `Europe/Minsk` (инвариант времени) — оставить Minsk локальной
  правкой; `transformIgnorePatterns` взять из рендера (вычисляется из пресета).
- **R11 (LOW) EAS.** Хука `eas-build-pre-install` нет ни в on-bike, ни в шаблоне — облачная сборка падает на
  `@rkarakulov/*` с F4 (не регрессия F3b). `eas.json` = рендер, `extra.eas.projectId` нет — переименование каталога EAS
  не ломает; локальные отличия — скрипты `build:testflight`/`build:play-internal`, иконка/splash в `app.json`.
- **R12 (LOW) Плагин без закрепления версии.** Маркетплейс ставит `app-dev-kit` с `main` базы, Codex читает
  `.ai/dev-kit` из `_commit` — тексты могут разойтись между update. Без установленного плагина нет и Stop-хука
  (advisory). Вне scope — заметка для app-foundation.
- **Deny-лист:** множества `deny` и `allow` рендера и on-bike совпадают (сравнение JSON). Отличия settings.json —
  `hooks.Stop` уходит в плагин, добавлены `extraKnownMarketplaces`/`enabledPlugins` — ослабления нет.

## 8.2 Deviations from spec
- Переименование `apps/mobile` → `apps/app` — решение автора (автономный режим): иначе `copier update` будет создавать в
  on-bike параллельный `apps/app`.
- Рекомендации architect R1–R12 (§8.1) приняты автором как есть: dev-БД `on_bike` (новая роль и БД в существующем томе,
  без удаления данных), `_commit: v0.1.2` правится вручную, доменные тексты процесса — в `.claude/rules/onbike-*.md`,
  порядок инвариантов §4 — как в шаблоне, CI — плюс `pnpm turbo run build`, `.prettierrc.json` on-bike до F5,
  выравнивание продуктовых пакетов (R9: `brand.ts`, тема `panel`, `PROJECT_ERROR_MESSAGES`, статус API в админке через
  словарь), пакеты базы 0.1.2, TZ jest `Europe/Minsk`. AC1 заменяется проверками (а)–(в) из S5.

## 8.3 Security checklist
Затронуты `.claude/settings.json` (deny-лист), CI, `.npmrc`, `infra/`. Deny-лист после F3b не слабее текущего (diff),
`.npmrc` без токена, CI — те же SHA; у job `secrets` добавляется `pull-requests: read` (нужно gitleaks на PR), секретов
в файлах нет (gitleaks).

## 9. Acceptance Criteria
1. `.copier-answers.yml` с `_commit: v0.1.2`; `uvx copier update --pretend` (или эквивалент) в on-bike не предлагает
   изменений общих файлов, кроме перечисленных локальных отличий.
2. `pnpm check` on-bike зелёный; `drizzle-kit generate` — без изменений; `expo export --platform android` собирается;
   API + worker стартуют.
3. В `.claude/` нет копий текстов процесса; `.claude/settings.json` подключает плагин; deny-лист не слабее прежнего.
4. Codex видит адаптеры из `.agents/skills` и читает `.ai/dev-kit`.
5. Нет ссылок на `apps/mobile` (кроме истории в docs/tasks и ADR) и на `@on-bike/config`.
6. CI на PR зелёный.

## 10. Documentation Impact
AGENTS.md, CLAUDE.md, `.claude/rules/*`, `docs/runbooks/local-dev.md` (плагин, `copier update`, путь `apps/app`),
`docs/architecture/README.md`, design.md (F3b сделан).

Дополнение architect: корневой `README.md` (пути и команды `@on-bike/app`, EAS), `docs/runbooks/README.md`,
`docs/architecture/README.md` (mobile → app), `docs/runbooks/local-dev.md` — переход существующего тома БД на
`on_bike` (R1); новые `.claude/rules/onbike-*.md` (R4); pr.md — подъём `@rkarakulov/*` до 0.1.2 (R8), видимая правка
статуса API в админке (R9), изменение прав CI (R6).

## 11. Implementation Context
Architect, 2026-10-23. Рендер для сравнения: `uvx copier@9.19.1 copy --vcs-ref v0.1.2 --defaults -d project_slug=on-bike
-d project_name=on-bike -d npm_scope=on-bike -d app_scheme=onbike -d bundle_id=by.onbike.app -d "author=Roman Karakulov"
-d use_postgis=true /Users/romankarakulov/PROJECTS/app-foundation <scratch>/render` (локальный путь вместо `gh:` —
то же содержимое тега). Сравнение: `diff -rq -x node_modules -x dist -x .git -x .turbo -x .expo render <on-bike>`
(для `apps/app` до S1 — против `apps/mobile`). Решения R1, R6, R7, R9 из §8.1 приняты как рекомендованные; если автор
выберет иначе — поправить строки таблицы.

### ENTRY POINTS
- `.copier-answers.yml` (новый) — точка `copier update`.
- `.claude/settings.json` — подключение плагина; `AGENTS.md`/`CLAUDE.md` — канон и навигация.
- `pnpm-workspace.yaml` (каталог `@rkarakulov/*` 0.1.2 + `@rkarakulov/config`), корневые конфиги lint/format/arch.
- `git mv apps/mobile apps/app`.

### Пофайловая таблица
Обозначения: **R** — взять из рендера как есть; **R≡** — уже совпадает с рендером; **R+L** — рендер + локальная правка
on-bike; **L** — файл шаблона, содержимое on-bike (продукт); **O** — только on-bike (вне шаблона); **N** — файл
шаблона, в on-bike не берётся (удалён в проекте: правки шаблона в нём теряются, R3); **D** — удалить из on-bike.

| Файл | Решение | Локальная правка / почему |
|---|---|---|
| `.copier-answers.yml` | R+L | `_commit: v0.1.2`, `_src_path: gh:rkarakulov/app-foundation` (R2) |
| `.editorconfig`, `.npmrc`, `.githooks/pre-push`, `scripts/install-git-hooks.mjs`, `turbo.json` | R≡ | — |
| `.githooks/pre-commit` | R | + `git diff --cached --check` (маркеры после update) |
| `.nvmrc` | R | `24.22` (совместимо с `devEngines ^24.22.0`) |
| `.gitignore` | R+L | `.astro/` — до F5 (R7) |
| `.prettierignore` | R+L | `.astro` — до F5 |
| `.prettierrc.json` | L | конфиг on-bike: опции пресета + `prettier-plugin-astro` и override `*.astro` — до F5 (R7) |
| `.dependency-cruiser.cjs` | R+L | `\\.astro` в `exclude` — до F5 |
| `tsconfig.depcruise.json` | R | extends `@rkarakulov/config/tsconfig.library.json` |
| `eslint.config.mjs` | R+L | `ignores` + `'**/.astro/**'`; `designSystemOnly: ['apps/{app,admin,landing}/src/**/*.{ts,tsx}']` — до F5 |
| `package.json` | R+L | devDep `prettier-plugin-astro` — до F5 |
| `pnpm-workspace.yaml` | R+L | catalog: `prettier-plugin-astro` (до F5), `@fontsource/playfair-display` (бренд); `@nestjs/config` удалить (не используется) |
| `pnpm-lock.yaml` | O | перегенерировать `pnpm install` |
| `README.md` | O | `_skip_if_exists`; `apps/mobile`/`@on-bike/mobile` → `apps/app`/`@on-bike/app` |
| `AGENTS.md` | R+L | разделы и порядок §4 шаблона + домен on-bike (R5) |
| `CLAUDE.md` | R+L | + строка навигации: доменные правила `.claude/rules/onbike-*.md`, `docs/product/` |
| `.github/workflows/ci.yml` | R+L | `pnpm turbo run build` вместо `--filter=@on-bike/api` (R6); БД `on_bike` (R1) |
| `infra/docker-compose.dev.yml` | R | при R1=A |
| `infra/docker-compose.prod.yml`, `infra/Caddyfile` | O | — |
| `tools/ai_review/{codex_review.sh,codex_arch_review.sh,review_contract.md}` | R | тексты шаблона без «on-bike» |
| `tools/ai_review/README.md` | R≡ | — |
| `.ai/dev-kit/**` (24 файла) | R | новый; не править |
| `.agents/skills/*/SKILL.md` (16) | R | не править |
| `.codex/config.toml`, `.codex/agents/{architect,coder,reviewer}.toml` | R | — |
| `.codex/agents/investigator.toml` | R | новый |
| `.claude/settings.json` | R | deny/allow совпадают; Stop-хук — в плагине |
| `.claude/{commands,agents,skills,hooks}/**`, `.claude/{ai-runtime,task-template,architecture-review-template}.md` | D | тексты в плагине/`.ai/dev-kit`; домен — в `onbike-*.md` (R4) |
| `.claude/rules/{backend,contracts,db,security,tests,web}.md` | R | байт-в-байт (R4-A) |
| `.claude/rules/app.md` | R | новый (вместо `mobile.md`) |
| `.claude/rules/mobile.md` | D | → `app.md` + `onbike-app.md` |
| `.claude/rules/onbike-backend.md` (`apps/api/**`) | O | контексты модулей, авторитет результатов/мест/кластеров, перечень append-only, тяжёлые задачи (трек, гео, Skia/ffmpeg, OG, бейджи, уведомления, сезон), dead-letter → панель, биометрия вне логов, PostGIS-тесты, reuse `@on-bike/tracks` |
| `.claude/rules/onbike-db.md` (пути `db.md`) | O | анонимизация «Удалённый участник», отдельное хранение биометрии, `ST_Buffer` |
| `.claude/rules/onbike-contracts.md` (пути `contracts.md`) | O | `src/<context>/<entity>.schema.ts`; кластеры/места/правдоподобие — только сервер |
| `.claude/rules/onbike-app.md` (`apps/app/**`) | O | рамки MVP, геолокация, импорт файлов, in-app + polling, 5 типов deep links, zustand, react-hook-form + zod, Jersey Aura/Night Ride, `accessibilityActions`; из скила: карта MapLibre, pre-check `@on-bike/tracks`, resumable upload, шеринг, удаление аккаунта; EAS не запускать |
| `.claude/rules/onbike-web.md` (`apps/admin/**`, `apps/landing/**`) | O | «Протокол» (1440, светлая, роли, TanStack Table, причина → аудит, биометрия только в споре, чек-лист публикации, флаги правдоподобия); landing Astro (SSR, OG 1200×630, Smart App Banner, удаление аккаунта, острова, темы light+dark); проверка `pnpm --filter <pkg> build` |
| `.claude/rules/onbike-security.md` (`apps/api/src/modules/{identity,media}/**`, `apps/landing/src/pages/account/**`) | O | «зона `security.md`: чек-лист обязателен»; AD-28 vs V-09, S3 + подписанные URL, парсеры FIT/GPX/KML с лимитами, биометрия |
| `.claude/rules/onbike-tests.md` (пути `tests.md`) | O | фикстуры треков `__fixtures__` (битые, пустые, без timestamp, вне коридора), Playwright (web), Maestro (app), TZ Europe/Minsk |
| `apps/app/` (git mv из `apps/mobile`) | — | история сохраняется |
| `apps/app/{.claude/settings.json,.gitignore,AGENTS.md,eas.json,metro.config.js,tsconfig.json}`, `assets/images/{android-icon-*,favicon,icon}.png`, `src/{app/ui-kit.tsx,components/tab-bar.tsx,lib/api.ts,types/assets.d.ts}`, `src/__tests__/{design-system-setup.test.ts,ui-kit.test.tsx}` | R≡ | — |
| `apps/app/.env.example`, `src/lib/query-client.ts`, `src/lib/query-client.test.ts` | R | путь/комментарии |
| `apps/app/package.json` | R+L | имя `@on-bike/app` (= рендер); deps on-bike (playfair, `@hookform/resolvers`, `expo-secure-store`, `react-hook-form`, `zustand`); скрипты `build:testflight`, `build:play-internal`; description |
| `apps/app/app.json` | R+L | `ios.icon` `expo.icon`, splash `splash-route-{light,dark}.png` 160 (бренд); `web.favicon` — из рендера |
| `apps/app/jest.config.js` | R+L | `TZ = 'Europe/Minsk'` (R10) |
| `apps/app/jest.setup.ts` | R+L | мок `expo-secure-store`, сброс сторов сессии/регистрации |
| `apps/app/src/theme/{design-system.ts,fonts.ts,fonts.test.ts}` | R+L | Playfair Display (бренд) |
| `apps/app/src/app/{_layout.tsx,(tabs)/_layout.tsx,(tabs)/index.tsx}`, `src/components/screen-placeholder.tsx`, `src/__tests__/{app-routes.ts,root-layout.test.tsx,tabs.test.tsx}` | L | гард сессии, вкладки on-bike |
| `apps/app/src/app/(tabs)/section.tsx`, `src/__tests__/{section.test.tsx,query-wrapper.tsx}`, `assets/images/splash-icon.png` | N | демо шаблона |
| `apps/app/src/{features/**,app/(onboarding)/**,app/auth/**,app/(tabs)/{races,rides,routes,calendar}.tsx,lib/countdown*}`, остальные `__tests__`, прочие `assets`, `.vscode/` | O | — |
| `apps/api/{.swcrc,nest-cli.json}`, `src/{worker.ts,db/index.ts}`, `src/modules/health/**`, `test/{db.ts,global-setup.ts}` | R≡ | — |
| `apps/api/{tsconfig.json,drizzle.config.ts,vitest.config.mts}`, `src/{main.ts,db/schema.ts}`, `test/harness.ts` | R | (+R1) |
| `apps/api/.env.example` | R+L | `JWT_SECRET`, `EMAIL_TOKEN_SECRET`, `APP_LINK_BASE`, `AGREEMENT_VERSION`; `MAIL_FROM='on-bike <no-reply@on-bike.by>'` в кавычках шаблона |
| `apps/api/package.json` | R+L | `@node-rs/argon2`, `jose`, `@on-bike/tracks` |
| `apps/api/src/{app.module.ts,worker.module.ts}` | R+L | `TracksModule`, `IdentityModule`; outbox-маршруты identity, `TracksWorkerModule`, `IdentityWorkerModule` |
| `apps/api/src/{queues.ts,config/env.ts,error-messages.ts}` | R+L | очереди, переменные, коды on-bike (имя `PROJECT_ERROR_MESSAGES`, R9) |
| `apps/api/test/test-env.ts` | R+L | переменные on-bike (константа `DB` — из рендера) |
| `apps/api/src/{config/env.test.ts,error-messages.test.ts}`, `test/harness.int.test.ts` | L | тесты продукта |
| `apps/api/drizzle/0000_init.sql`, `drizzle/meta/{0000_snapshot,_journal}.json` | N/L | миграции on-bike не трогать (шаблон их не меняет после тега) |
| `apps/api/src/modules/{identity,tracks}/**`, прочее `test/**` | O | — |
| `apps/admin/{.gitignore,src/main.tsx}` | R≡ | — |
| `apps/admin/{tsconfig.json,vite.config.ts}`, `src/{api.ts,design-system.ts,index.css,App.tsx}` | R | `panel` (R9), статус словарём (R9) |
| `apps/admin/package.json` | R+L | `@fontsource/playfair-display`; description |
| `apps/admin/index.html` | L | заголовок «Панель организатора» |
| `apps/admin/src/{App.test.tsx,design-system.test.ts,fonts.ts}`, `public/favicon.svg` | R+L | заголовок, значения бренда, Playfair, иконка |
| `apps/landing/**` | O | до F5; `package.json`: убрать devDep `@on-bike/config` (tsconfig — astro) |
| `packages/{contracts,api-client,design-tokens,i18n}/{package.json,tsconfig.json,tsconfig.build.json}`, `api-client/vitest.config.ts` | R | `@rkarakulov/config`, `customConditions` |
| `packages/contracts/src/health.ts` | R≡ | — |
| `packages/contracts/src/{common.ts,index.ts}`, `api-client/src/index.ts` | R+L | коды и эндпоинты on-bike |
| `packages/i18n/src/index.ts` | R | — |
| `packages/i18n/src/ru.ts` | R+L | строки on-bike (+`apiStatus.ok/degraded`, R9) |
| `packages/design-tokens/src/brand.ts` | R+L | бренд on-bike (из `primitives.ts` + `themes.ts`, `protocol` → `panel`) |
| `packages/design-tokens/src/{index,css,contrast}.ts` | R+L | доп. группы ролей (`map`, `surfaceBar`) и пары контраста карты |
| `packages/design-tokens/src/{primitives,themes}.ts` | D | → `brand.ts` |
| `packages/*/src/*.test.ts`, `contracts/src/auth/**`, `api-client/src/auth.test.ts` | L/O | продукт |
| `packages/tracks/**` | O | devDep `@rkarakulov/config: catalog:`; tsconfig extends `@rkarakulov/config/tsconfig.library.json` + `customConditions: ['@on-bike/source']` |
| `packages/config/**` | D | заменён `@rkarakulov/config` |
| `docs/README.md` | L | таблица on-bike (product, architecture, proposal) |
| `docs/runbooks/local-dev.md` | R+L | разделы on-bike: identity-переменные, Expo Go/`APP_LINK_BASE`, проверка регистрации, переход тома БД (R1) |
| `docs/adr/0001-stack.md` | N | у on-bike свои ADR-0001/0004 |
| `docs/tasks/.gitkeep` | R | — |
| `docs/{architecture,adr,runbooks}/README.md`, `docs/product/**` | O | ссылки `mobile` → `app` |

### Слайсы и проверка после каждого
Коммит на слайс; `git add` — по путям. Во временных репозиториях scratchpad тоже по путям (deny-лист).
- **S1 `apps/mobile` → `apps/app`.** `git mv`, имя `@on-bike/app`, минимально пути в `eslint.config.mjs`, `.gitignore`,
  `.prettierignore`, `.claude/rules/mobile.md`, `AGENTS.md`, `README.md`, runbook. Проверка: `pnpm install`,
  `pnpm check`, `pnpm --filter @on-bike/app exec expo export --platform android`, `git grep -n "apps/mobile\|@on-bike/mobile"`
  (кроме `docs/tasks`, `docs/adr`, `.claude/{skills,commands,hooks}` — уйдут в S4).
- **S2 корень, tooling, `@rkarakulov/config`, пакеты.** Корневые файлы и `packages/*` по таблице, каталог 0.1.2, `tracks`,
  landing, удалить `packages/config`; R9 (design-tokens, `PROJECT_ERROR_MESSAGES`, admin `App.tsx`). Проверка:
  `pnpm install` (lock), `pnpm check`, `pnpm build`, загрузка `dist` API (как в CI), `pnpm --filter @on-bike/api
  db:generate` — без новой миграции, `prettier --check` видит `.astro`; защита ESLint не ослабла: через `eslint --stdin
  --stdin-filename` для `apps/app/src/x.tsx` и `apps/landing/src/x.ts` — hex-литерал и импорт `@rkarakulov/design-tokens`
  дают ошибку; `git grep -n "@on-bike/config"` пуст.
- **S3 CI, infra, tools, имя БД.** `ci.yml`, compose, `.env.example`, `drizzle.config.ts`, `test-env.ts`, `vitest.config.mts`,
  `tools/ai_review/*`. Проверка: роль/БД `on_bike` в существующем томе (R1, без удаления), `db:migrate`, `pnpm test`
  (интеграционные), API + worker стартуют, `GET /v1/health` = 200, письмо доходит до Mailpit; `actionlint` (если есть);
  `gitleaks`.
- **S4 AI-инфраструктура.** `.ai/dev-kit`, `.agents`, `.codex`, `.claude/settings.json`, правила шаблона + `onbike-*.md`
  (чек-лист переноса R4), удаления `.claude/*`, AGENTS.md (R5), CLAUDE.md. Проверка: в `.claude/` только `settings.json`
  и `rules/`; сравнение `permissions.deny`/`allow` JSON с `main` — пусто; `codex debug prompt-input` видит
  `.agents/skills` и `.ai/dev-kit`; `git grep -n "\.claude/\(commands\|agents\|skills\|hooks\|ai-runtime\|task-template\)"`
  (кроме `docs/tasks`) пуст; `pnpm check`.
- **S5 `.copier-answers.yml` и update.** (а) Инвентарь: свежий рендер `v0.1.2` + `diff -rq` → каждое отличие есть в §12
  (R / R+L / L / N / D), неожиданных нет. (б) Клон ветки on-bike в scratchpad, `_src_path` → локальный клон базы;
  `copier update --defaults --vcs-ref v0.1.2` → «Keeping template version», `git status` пуст. (в) Клон базы в scratchpad:
  ветка от `v0.1.2`, безобидные правки в `template/` — файл R≡ (`turbo.json` или `.githooks/pre-push`), файлы R+L в
  другом куске (`AGENTS.md.jinja` §6, комментарий в `.github/workflows/ci.yml.jinja`, `apps/api/src/app.module.ts`),
  N-файл (`docs/adr/0001-stack.md`); тег `v0.1.3`. В клоне on-bike `copier update --defaults --vcs-ref v0.1.3` →
  `_commit: v0.1.3`, нет `*.rej`, `git diff --check` чист, `git diff` = только тестовые куски, N-файл не появился.
  Реальный on-bike update не запускать. Повторить (а)–(в) после S6.
- **S6 Документы.** §10; §12 — перечень локальных отличий (по группам, с пометкой «до F5») и список N-файлов. Проверка:
  `pnpm format:check`, финальный `pnpm check`, повтор S5, AC5-grep.

### FILES TO READ
- app-foundation `v0.1.2`: `copier.yml`, `README.md` (разделы «Обновление проекта», «Разработка шаблона»),
  `.github/workflows/ci.yml` (job `template-update` — образец проверки update), `packages/config/{eslint.js,prettier.json,
  tsconfig.library.json}`, `plugin/hooks/hooks.json`, `template/AGENTS.md.jinja`.
- on-bike: `.claude/rules/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/verify-task.md` (источник домена для R4),
  `packages/design-tokens/src/*`, `.github/workflows/ci.yml`, `docs/runbooks/local-dev.md`,
  `docs/adr/{0003-universal-rider-app,0004-app-foundation}.md`, `docs/tasks/2026-10-22-app-foundation/design.md` §3–§4.

### TESTS / CHECKS
Новых продуктовых тестов нет (поведение не меняется); меняются ожидания `App.test.tsx` (R9) и `design-system.test.ts`
(`panel`). Обязательные: `pnpm check`, `pnpm build` + загрузка `dist` API, `db:generate` без изменений,
`expo export --platform android`, интеграционные тесты API на реальной БД, старт API + worker, ESLint-guard через stdin,
deny-лист JSON-diff, `codex debug prompt-input`, AC5-grep, `gitleaks`, проверки S5 (а)–(в), CI на PR.

### OUT OF SCOPE
Удаление landing и web/PWA (F5); identity/админка с ролями (F6); ESM для API; правки шаблона базы — отдельными задачами в
app-foundation: сборка всех приложений в CI шаблона (R6), вопрос `db_name` (R1-C), хук `eas-build-pre-install` (R11),
закрепление версии плагина (R12); смена name/slug/scheme/bundle Expo; прод-инфраструктура; запуск `copier update` в
настоящем on-bike на новый тег.

## 12. Outcome
Заполняет coder.
