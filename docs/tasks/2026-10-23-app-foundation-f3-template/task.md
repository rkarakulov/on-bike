# F3: шаблон проекта (copier) в app-foundation

## 1. Title
Шаблон copier `rkarakulov/app-foundation` → новый проект на базе за одну команду (ADR-0004, F3).

## 2. Goal
`copier copy gh:rkarakulov/app-foundation <dir>` создаёт монорепо проекта, которое сразу проходит `pnpm install && pnpm check`,
запускает API + worker и универсальное приложение с нейтральным брендом, а `copier update` переносит изменения шаблона.
Дизайн: [`../2026-10-22-app-foundation/design.md`](../2026-10-22-app-foundation/design.md) §1, §3, §4 (F3).
Решение человека 2026-10-22: работать автономно; слияния — за человеком.

## 3. Scope
- **copier.yml** в корне app-foundation: `_subdirectory: template`, `_templates_suffix: .jinja`, `_answers_file:
  .copier-answers.yml`, `_min_copier_version: "9"`. Вопросы: `project_slug` (kebab), `project_name`, `npm_scope`
  (по умолчанию = slug), `app_scheme`, `bundle_id`, `author`, `use_postgis` (bool, по умолчанию false).
  Версия базы (`@rkarakulov/*`) — из шаблона, не вопрос.
- **template/** — каркас по образцу on-bike без домена:
  - корень: `package.json` (скрипты как в on-bike: check, infra, dev…), `pnpm-workspace.yaml` (catalog, в т.ч.
    `@rkarakulov/*` текущей версии базы; `minimumReleaseAgeExclude` только для `@rkarakulov/*`), `turbo.json`, `.npmrc`
    (только маппинг scope), `.nvmrc`, `.editorconfig`, `.gitignore`, `.prettierrc.json`/`.prettierignore`,
    `eslint.config.mjs` на `createEslintConfig` из `@rkarakulov/config/eslint`, `.dependency-cruiser.cjs`,
    `.githooks` + `scripts/install-git-hooks.mjs`;
  - `apps/api` — NestJS на `api-kit`: env (`defineEnv` + `mailEnvShape`), `AppModule`/`WorkerModule`, модуль health,
    `db/schema.ts` (реэкспорт outbox), первая миграция drizzle с outbox, `queues.ts`, `error-messages.ts`, тестовый стенд
    на `test-kit`, vitest unit+integration, `tsconfig` с `moduleResolution: Bundler` (как on-bike F4), `.env.example`;
  - `apps/app` — универсальное Expo-приложение (iOS/Android сейчас; web/PWA — F5): `src/theme/design-system.ts`
    (`configureDesignSystem` с брендом проекта), `_layout`, вкладки (Главная + заглушка раздела с `AsyncContent`), витрина
    `/ui-kit` (`UiKit` базы, только dev), jest-expo с `transformIgnorePatterns` для `@rkarakulov`, сторож первого импорта;
  - `apps/admin` — Vite + React: `designSystemCss` бренда (тема `panel`), страница-заглушка; вход и роли — F6;
  - `packages/{contracts,api-client,i18n,design-tokens}` — тонкие слои над базой (как on-bike после F4), бренд —
    нейтральный (`neutralThemes`, системные шрифты) с местом для своего;
  - `infra/docker-compose.dev.yml` — PostgreSQL 18 (PostGIS при `use_postgis`), Redis 8.8, Mailpit;
  - CI (`.github/workflows/ci.yml`): gitleaks, install через `setup-node` + `GITHUB_TOKEN`, `pnpm check`, смоук `dist` API;
  - AI: `AGENTS.md` (разделы по соглашению плагина: §2 структура, §3 команды, §4 инварианты, §7 safety), `CLAUDE.md`,
    `.claude/settings.json` (deny-лист как on-bike + `extraKnownMarketplaces`/`enabledPlugins` app-dev-kit и superpowers),
    `.claude/rules/*` (общие для стека), `tools/ai_review/` (контракт + мосты Codex), адаптеры Codex `.agents/skills/*`,
    `.codex/{config.toml,agents/*.toml}`, которые читают тексты фаз из `.ai/dev-kit/` — копии `plugin/` (синхронизирует
    скрипт базы, CI базы проверяет отсутствие расхождений);
  - `docs/{adr/0001-stack.md,tasks/.gitkeep,runbooks/local-dev.md}`, `README.md`.
- **CI базы**: job `template` — `copier copy --defaults --vcs-ref HEAD` во временный каталог → `pnpm install` →
  `pnpm check` (services PG/Redis) → смоук `dist` API; плюс `pnpm smoke` уже есть.
- **Версия шаблона**: release базы ставит тег `vX.Y.Z` (= версия пакетов, fixed-группа), `copier update` берёт его.
- **README базы**: создание проекта, обновление (`copier update`), что спрашивает шаблон.

## 4. Out of Scope
- Принятие шаблона в on-bike (`.copier-answers.yml`, сверка, переключение `.claude` на плагин) — следующая задача F3b.
- Web/PWA/SSR приложения — F5; вход, роли, админка — F6; identity — F6.
- `foundation:link` (разработка базы рядом с проектом) — отдельная задача.

## 5. Architecture Context
- Шаблон рендерится copier (Python, `uvx copier`), jinja только в файлах `*.jinja`; остальные копируются как есть.
- Сгенерированный проект зависит от опубликованных `@rkarakulov/*` (GitHub Packages); в CI базы — через `GITHUB_TOKEN`.
- Плагин `app-dev-kit` подключается через `.claude/settings.json`; Codex читает вендоренную копию.

- **Разделители Jinja (architect, проверено прототипом на copier 9.19.1):** `_envops` с `[[ ]]`, `[% %]`, `[# #]` и
  `undefined: jinja2.StrictUndefined`. Причина: почти каждый TS/TSX-файл импортирует `@<scope>/…` и потому `.jinja`, а
  в TSX — `style={{ … }}`, в GitHub Actions — `${{ }}`. С этими разделителями оба проходят как есть, без `{% raw %}`.
  Имена файлов и каталогов copier рендерит всегда (и без суффикса) — теми же разделителями. Shell-скрипты (`[[ … ]]`
  bash), TOML (`[[…]]`) и `.ai/dev-kit/**` **никогда** не делаются `.jinja`.
- **Версия базы** — вычисляемая переменная `foundation_version` в `copier.yml` (`when: false`, `default` = версия
  fixed-группы `@rkarakulov/*`). Не пишется в `.copier-answers.yml` и при `copier update` пересчитывается из новой версии
  шаблона → каталог `@rkarakulov/*` проекта поднимается сам (проверено: `0.1.1 → 0.1.2` через update). Переопределяется
  `-d foundation_version=…` (нужно только CI базы, см. §8.1 п.2).
- **Имя БД** — вычисляемая `db_name` = `project_slug` с `_` вместо `-`: стенд `test-kit` принимает только
  `[a-z0-9_]+_test` (`packages/test-kit/src/db.ts:6-13`).
- Проверяется **только отрендеренный проект**: ESLint и Prettier базы игнорируют `template/`; рендер — во временный
  каталог **вне** репозитория базы (иначе Node-резолв поднимется к `node_modules` базы и скроет недостающие зависимости).
- `_tasks` и `_jinja_extensions` не используются: им нужен `--trust`. Следующие шаги — в `_message_after_copy`.

## 5.1 Placement & Reuse Gate
- Код в шаблоне — только композиция и тонкие слои; всё общее — пакеты базы (не копировать код пакетов в шаблон).
- Источник образца — on-bike после F4 (без домена: identity, tracks, тексты продукта).
- Тексты фаз для Codex — генерируются из `plugin/`, руками не правятся.

- Reuse (architect): tsconfig, ESLint, Prettier — из `@rkarakulov/config` (`tsconfig.library.json`, `tsconfig.react.json`,
  `createEslintConfig`, `prettier`); локального `packages/config` в шаблоне нет (в on-bike это остаток до F4).
  `transformIgnorePatterns` jest — вычислять из пресета `jest-expo` (README базы, п.5), а не хардкодить список как в on-bike.
  API: `defineEnv`/`mailEnvShape`, модули `api-kit`, `outbox` — реэкспорт `@rkarakulov/api-kit/outbox-schema`,
  стенд — `createApiHarness`/`recreateTestDatabase`/`truncateAll` из `test-kit`. UI — `configureDesignSystem`, `UiKit`,
  `AsyncContent`, `textStyle`, `useTheme` из `@rkarakulov/ui`; темы — `neutralThemes`/`neutralFontStack`/`defineThemes`.
- Запрещённые дубли: копии кода пакетов базы (env-основа, фильтр ошибок, стенд, компоненты, генератор CSS), ручные
  адаптеры Codex (генерирует `scripts/sync-template-ai.mjs`), ручная правка `.ai/dev-kit/**` в базе или проекте.

## 6. Relevant Files
- app-foundation: `copier.yml`, `template/**`, `scripts/sync-template-ai.mjs`, `.github/workflows/{ci,release}.yml`, `README.md`.
- образец: on-bike `apps/{api,mobile,admin}`, `packages/*`, `.claude/settings.json`, `.claude/rules/*`, `tools/ai_review/*`,
  `.agents`, `.codex`, `infra/docker-compose.dev.yml`, `.github/workflows/ci.yml`, `AGENTS.md`.

## 7. Implementation Notes
- Имена `@{{ npm_scope }}/…`, схема ссылок `{{ app_scheme }}://`, bundle id — в app.json/app.config.
- `.npmrc` без токена (pnpm 11), runbook — `~/.npmrc` + `NODE_AUTH_TOKEN`.
- Файлы с `{{`/`{%` в исходном виде (например, GitHub Actions `${{ }}`) — экранировать (`{% raw %}`) или не делать `.jinja`.

## 8. Risks / Assumptions / Open Questions
- Сгенерированный проект в CI базы ставит пакеты из реестра: версия в шаблоне должна быть опубликована (релиз сначала
  публикует пакеты, затем шаблон с этой версией; в PR-проверке — текущая опубликованная версия).
- copier и PEP 440: теги пакетов `@rkarakulov/x@0.1.1` copier игнорирует; нужен тег `v0.1.1`.

## 8.1 Requirements Consistency
Architect, 2026-10-23. Блокеров нет; решения ниже — рекомендации, принятые для автономной работы (отклонение от
рекомендации coder фиксирует в §8.2).

1. **Вредное решение (HIGH) — разделители Jinja.** §7 предлагает `{% raw %}` или «не делать `.jinja»`. Но почти все
   TS/TSX импортируют `@<scope>/…` → обязаны быть `.jinja`, а JSX содержит `{{` (on-bike: `_layout.tsx`,
   `(tabs)/_layout.tsx`, `tab-bar.tsx`, `(onboarding)/_layout.tsx`), CI — `${{ }}`. `{% raw %}` в десятке TSX хрупко:
   правка шаблона без raw ломает рендер или (`{{flex}}`) тихо подставляет пустоту.
   Альтернативы: (a) `{% raw %}` по месту; (b) фиксированный scope `@app/*` без вопроса — меньше `.jinja`, но F3b
   (on-bike, `@on-bike/*`) получит огромный дифф; (c) `_envops`: `[[ ]]` / `[% %]` / `[# #]` + `StrictUndefined`.
   **Рекомендация: (c)** — исторические разделители copier ≤5, проверено прототипом (JSX и `${{ }}` проходят,
   условный каталог `[% if use_postgis %]…[% endif %]` работает). Правило: bash-скрипты, TOML, `.ai/**` — не `.jinja`.
2. **Противоречие (HIGH) — «тег = версия пакетов» vs проверка шаблона и шаблонные правки.**
   (i) В PR «Релиз пакетов» шаблон уже ссылается на X.Y.Z, которой ещё нет в реестре → рендер в CI красный.
   (ii) Изменение только `template/` не даёт релиза пакетов → нет нового тега → `copier update` его не увидит.
   Рекомендация (A): `foundation_version` в `copier.yml` синхронизирует `scripts/sync-template-version.mjs` внутри
   `pnpm version-packages` (= `changeset version` + синхронизация; вход `version:` у `changesets/action`);
   `pnpm check` базы сверяет `copier.yml` с версией группы. CI PR рендерит шаблон с его версией, если она опубликована,
   иначе — с последней опубликованной (`-d foundation_version=…`, предупреждение в логе). После публикации job
   `template-release` рендерит с **точной** новой версией, гонит полную проверку и только тогда ставит `vX.Y.Z`.
   Любое изменение `template/`/`copier.yml` — с changeset (patch группы); CI проверяет наличие changeset при изменении
   этих путей. Шаблон, которому нужна ещё не выпущенная функция пакета, — отдельным PR после релиза.
   Альтернативы: (B) теги `vX.Y.Z.postN` (PEP 440) для шаблонных правок без релиза пакетов — сложнее автоматизация;
   (C) рендер PR против локально упакованных пакетов (`pnpm pack` + `overrides`) — не проверяет путь из реестра (AC1).
   Первый тег: F3 несёт changeset → после слияния PR релиза 0.1.2 → `template-release` ставит `v0.1.2`. Тег `v0.1.1`
   задним числом не ставим.
3. **Конфликт с кодом (MEDIUM) — имя БД.** `project_slug` в kebab-case (`my-app`), а `test-kit` требует
   `[a-z0-9_]+_test` (`packages/test-kit/src/db.ts:8`) → `my-app_test` упадёт. Решение: вычисляемая `db_name`
   (`project_slug | replace('-', '_')`) для пользователя/БД в compose, `.env.example`, `test-env.ts`, CI.
4. **Недоопределено / конфликт с API базы (MEDIUM) — «системные шрифты» в нативном приложении.** `textStyle` базы
   задаёт только `fontFamily` без `fontWeight` (`packages/ui/src/theme/fonts.ts:11-20`, «Android не синтезирует вес»):
   с системным шрифтом все веса 400–700 станут одинаковыми (iOS `System`), на Android — только `sans-serif`/
   `sans-serif-medium`. Альтернативы: (a) нейтральный открытый шрифт Inter: приложение — `@expo-google-fonts/inter`
   (обе роли), админка — `@fontsource/inter`, `fontStack` бренда — Inter + системный фолбэк; (b) системные семейства
   через `Platform.select` с потерей весов на iOS; (c) задача в базе: `textStyle` добавляет `fontWeight` для системных
   семейств. **Рекомендация: (a)** сейчас (веса верны, бренд заменяет одним файлом), (c) — follow-up. Цвета —
   `neutralThemes` без изменений.
5. **Конфликт с кодом (MEDIUM) — тесты образца завязаны на домен.** `apps/api/src/error-messages.test.ts` on-bike
   требует непустой список кодов проекта (`expect(projectCodes).not.toEqual([])`), `contracts/common.test.ts` — коды
   регистрации, `harness.int.test.ts` — `users`/`register`. В шаблоне кодов проекта нет: `defineErrorCodes([])`
   допустим (`contracts-core/src/errors.ts:18-28`); тест — «у каждого кода проекта есть текст» без требования
   непустоты + проверка порядка `ErrorCode.options` = коды базы. Стенд — `/v1/health` 200, worker-граф с `ENV`/`MAILER`,
   `reset()` чистит `outbox` (+ `spatial_ref_sys` цел — только при `use_postgis`).
6. **Вредное решение (MEDIUM) — проверка шаблона линтерами базы.** `pnpm lint`/`format:check` базы идут по `.`
   и зацепят `template/**` (сырые `.jinja`, TS без зависимостей). Решение: `template/**` — в `ignores` ESLint и в
   `.prettierignore` базы; формат и линт шаблона проверяет `pnpm check` отрендеренного проекта.
7. **Недоопределено (MEDIUM) — где рендерить в CI.** Каталог внутри репозитория базы даст ложный зелёный (резолв
   модулей к `node_modules` базы). Рендер — в `$RUNNER_TEMP` / `os.tmpdir()`; `pnpm install --no-frozen-lockfile`
   (lock-файла в шаблоне нет — он у каждого проекта свой; первый коммит проекта включает `pnpm-lock.yaml`).
   Следствие: job шаблона может покраснеть от нового релиза стороннего пакета без изменений базы — принимаем
   (защита — `minimumReleaseAge` pnpm и диапазоны как в on-bike).
8. **Недоопределено (LOW) — соглашение плагина шире scope.** `plugin/README.md` требует в `AGENTS.md` разделы §0–§10
   (scope перечисляет §2, §3, §4, §7) и `docs/README.md`. Решение: скелет `AGENTS.md` со всеми §0–§10 (§1 — заглушка
   «опишите проект»), `docs/README.md` — индекс; `docs/product/`, `docs/architecture/` не создаём (по соглашению — gap).
9. **Конфликт (LOW) — двойной Stop-хук.** `.claude/settings.json` on-bike вызывает `.claude/hooks/completion-gate.sh`,
   а плагин `app-dev-kit` ставит тот же хук сам (`plugin/hooks/hooks.json`). В шаблоне блока `hooks` нет.
10. **Недоопределено (LOW) — смена `use_postgis` после создания.** Расширение создаёт миграция `0000`; повторный рендер
    с `use_postgis=true` поменяет уже применённую миграцию, drizzle её не перезапустит. В `help` вопроса: «включить
    позже — новой миграцией `CREATE EXTENSION postgis`».
11. **Недоопределено (LOW) — плагинные пути для Codex.** Тексты плагина ссылаются на `${CLAUDE_PLUGIN_ROOT}/…`.
    Решение: адаптеры Codex говорят «`${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`», и та же строка — в
    `plugin/docs/ai-runtime.md` (колонка Codex). Это правка плагина → `version` плагина `0.1.0 → 0.1.1`.
12. **LOW — ручные шаги нового проекта.** Приватный репозиторий: `copier copy gh:…` требует git-учётных данных
    (`gh auth setup-git`); CI проекта читает пакеты только после «Manage Actions access» в настройках **каждого** из
    8 пакетов. Это в README базы, `docs/runbooks/local-dev.md` проекта и `_message_after_copy`.
13. **LOW — `template/CLAUDE.md` и `template/.claude/**` внутри репозитория базы.** Claude Code в базе может подхватить
    `template/CLAUDE.md` при работе в `template/`. В `AGENTS.md` базы §2: «файлы `template/` — содержимое шаблона, не
    инструкции для работы в базе».
14. **LOW — домен в образце, не очевидный grep'ом.** `TZ = 'Europe/Minsk'` в jest, `MAIL_FROM on-bike`, splash
    `splash-route-*`, иконки, «Панель организатора», `APP_LINK_BASE`, `AGREEMENT_VERSION`, `@node-rs/argon2`, `jose`,
    `zustand`/`react-hook-form` (только auth). В шаблон — не-UTC пояс без DST (например `Asia/Tbilisi`), ассеты
    из стандартного шаблона Expo, нейтральные строки.

## 8.2 Deviations from spec
- A1/A2 (b8d7e1c, 248dd63): `.claude/rules/{contracts,tests,security}.md` без `.jinja` (нет переменных); CI проекта —
  полный `pnpm check` без PR-фильтра turbo; нумерация инвариантов AGENTS.md шаблона §4.11–§4.13 сохранена под контракт
  ревью, §4.13 — iOS/Android (web — F5). Приняты автором.
- S0 (исполнитель A, коммит 5246077 app-foundation): `.githooks` и `scripts/install-git-hooks.mjs` перенесены из A1 в S0 —
  без них падает `prepare` при `pnpm install`; валидатор у `npm_scope` (как у slug); регулярка `bundle_id` с `[.]` вместо
  `\.`; `check-template.mjs` — временный каталог удаляется только после успеха без `--keep`, `--out` не удаляется; copier —
  uvx → pipx → PATH. Приняты автором.

## 8.3 Security checklist
Затронуты инфраструктура и секреты (CI шаблона, `.claude/settings.json` deny-лист, `.npmrc`).
- AuthN/AuthZ: не затронуты (identity — F6).
- Секреты: `.env.example` без секретов, `.npmrc` без токена, gitleaks в hooks и CI; deny-лист чтения `.env*`.
- Остальное — не затронуто.

## 9. Acceptance Criteria
1. `uvx copier copy --defaults --vcs-ref HEAD <app-foundation> /tmp/x` → `pnpm install` → `pnpm check` зелёный (CI базы).
2. В сгенерированном проекте API + worker стартуют, `/v1/health` 200; `expo export --platform android` собирает бандл.
3. Нет кода пакетов базы в шаблоне (только композиция); нет домена on-bike (grep).
4. `copier update` из сгенерированного проекта на новую версию шаблона применяет изменения (проверка вручную на двух тегах
   или локально `--vcs-ref`).
5. `.ai/dev-kit` совпадает с `plugin/` (CI базы).
6. `claude plugin validate`, `pnpm check`, `pnpm smoke` базы — зелёные.

## 10. Documentation Impact
README базы (создание и обновление проекта), AGENTS.md базы (§2 — template/), design.md (F3 выполнен, F3b).

Дополнение architect: `plugin/docs/ai-runtime.md` и `plugin/README.md` §Codex (`.ai/dev-kit` как `${CLAUDE_PLUGIN_ROOT}`
для Codex) + версия плагина 0.1.1; AGENTS.md базы §3 (команды `template:sync`, `template:check`, `version-packages`) и
§4 (шаблонные правки — с changeset; `.ai/dev-kit` — только генерацией); README базы — раздел «Разработка шаблона»
(разделители `[[ ]]`, проверка рендера, теги `vX.Y.Z` ставит `template-release`). ADR не нужен: решения — реализация
ADR-0004 (шаблон copier, тег = версия); отклонения фиксируются в §8.2 этой задачи.

## 11. Implementation Context
Architect, 2026-10-23. Пути шаблона — относительно `app-foundation/`; «образец» — on-bike на ветке
`feature/onbike-on-foundation` (`git show feature/onbike-on-foundation:<path>`). Пометки: **J** — `.jinja`
(содержит ответы), **C** — копия как есть, **G** — генерирует скрипт базы (руками не править).

### ENTRY POINTS
- `copier.yml` (корень базы) — вопросы и настройки; `template/` — корень рендера.
- `scripts/check-template.mjs` — единая проверка шаблона (локально и в CI): рендер → install → check → смоук.
- `scripts/sync-template-ai.mjs` — `plugin/` → `template/.ai/dev-kit/` + адаптеры Codex; `--check` — сверка.
- `scripts/sync-template-version.mjs` — версия группы `@rkarakulov/*` → `foundation_version` в `copier.yml`; `--check`.

### Общий интерфейс исполнителей A и B (фиксируется до старта, менять — только через task.md)
- `copier.yml`:
  ```yaml
  _subdirectory: template
  _templates_suffix: .jinja
  _answers_file: .copier-answers.yml
  _min_copier_version: "9"
  _envops: { block_start_string: "[%", block_end_string: "%]", variable_start_string: "[[",
             variable_end_string: "]]", comment_start_string: "[#", comment_end_string: "#]",
             keep_trailing_newline: true, undefined: jinja2.StrictUndefined }
  _exclude: [".DS_Store", "~*", "__pycache__", "*.py[co]", "node_modules", "dist", ".turbo", ".expo", "*.tsbuildinfo"]
  _skip_if_exists: ["README.md"]
  ```
  `_skip_if_exists` — только README: бренд (`brand.ts`) и словарь (`ru.ts`) должны получать изменения шаблона
  трёхсторонним слиянием, иначе новый экран шаблона сошлётся на ключ, которого нет в пропущенном файле.
  Вопросы (с валидаторами `regex_search`): `project_slug` (`^[a-z][a-z0-9-]*[a-z0-9]$`, default `my-app` — нужен для
  `--defaults`), `project_name` (default — slug с пробелами, title), `npm_scope` (default `[[ project_slug ]]`),
  `app_scheme` (`^[a-z][a-z0-9+.-]*$`, default — slug без дефисов), `bundle_id` (`^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$`
  — валиден и для iOS, и для Android; default `com.example.[[ app_scheme ]]`), `author` (str, default `""`),
  `use_postgis` (bool, false; help из §8.1 п.10). Вычисляемые (`when: false`): `foundation_version` (строка версии
  группы; правит только `sync-template-version.mjs`), `db_name` (`[[ project_slug | replace('-', '_') ]]`).
  `_message_after_copy` — шаги: `git init`, `export NODE_AUTH_TOKEN=$(gh auth token)`, `pnpm install`, `pnpm infra:up`,
  `pnpm --filter @[[ npm_scope ]]/api db:migrate`, `pnpm check`, первый коммит с `pnpm-lock.yaml`, доступ CI к пакетам.
- Имена пакетов: `@[[ npm_scope ]]/{api,app,admin,contracts,api-client,i18n,design-tokens}`; условие экспорта
  исходников — `@[[ npm_scope ]]/source` (как `@on-bike/source`).
- Скрипты пакетов (их зовут корень и CI): все — `typecheck`, `test`; `build` — у api, admin и `packages/*`;
  `dev` — api, app, admin; `dev:worker`, `db:generate`, `db:migrate`, `start`, `start:worker` — api.
- Порты и окружение: API `:3000`, admin `:5173` (proxy `/v1`), PG `:5432`, Redis `:6379`, Mailpit `:1025/:8025`;
  `DATABASE_URL=postgres://[[ db_name ]]:[[ db_name ]]@127.0.0.1:5432/[[ db_name ]]`, тестовые `DATABASE_URL_TEST`
  (`…/[[ db_name ]]_test`) и `REDIS_URL_TEST` (`redis://127.0.0.1:6379/1`) — значения по умолчанию в `test-env.ts`,
  переопределяются env (turbo пропускает их в `test`).
- Каталог `pnpm-workspace.yaml` (владелец — A): весь каталог on-bike **минус** `prettier-plugin-astro`,
  `@fontsource/playfair-display`, `@nestjs/config`; **плюс** `@rkarakulov/config`; `@rkarakulov/*` = `[[ foundation_version ]]`
  (точная версия). B пишет в `package.json` `catalog:` только для этих имён, остальное — литералами, как в on-bike.
  Нужна новая запись каталога — B пишет её в §8.2, A добавляет.

### FILES TO CREATE — `template/`

Исполнитель **A** (корень, infra, CI, AI, документы):
```
[[ _copier_conf.answers_file ]].jinja   J  "# Changes here will be overwritten by Copier; NEVER EDIT MANUALLY\n[[ _copier_answers|to_nice_yaml -]]"
package.json.jinja                      J  ← on-bike package.json: name = slug, фильтры @scope, devDeps + @rkarakulov/config
pnpm-workspace.yaml.jinja               J  ← on-bike (apps/*, packages/*, hoisted, minimumReleaseAgeExclude только @rkarakulov/*, allowBuilds)
turbo.json .nvmrc .editorconfig         C  ← on-bike
.npmrc                                  C  ← on-bike (только маппинг scope, без токена)
.gitignore                              C  ← on-bike: apps/mobile → apps/app, без Astro, + *.rej
.prettierrc.json                        C  ← on-bike (или строка "@rkarakulov/config/prettier" — если prettier её принимает)
.prettierignore                         C  ← on-bike без .astro; + .ai, .copier-answers.yml, apps/app/assets, apps/api/drizzle/meta
eslint.config.mjs                       C  createEslintConfig({ ignores: ['apps/api/drizzle/**'], reactNative: ['apps/app/**/*.{ts,tsx,js}'],
                                           browser: ['apps/admin/**/*.{ts,tsx}'], nest: ['apps/api/**/*.ts'],
                                           designSystemOnly: ['apps/{app,admin}/src/**/*.{ts,tsx}'], paletteModules: ['@rkarakulov/design-tokens'] })
.dependency-cruiser.cjs                 C  ← on-bike без .astro
tsconfig.depcruise.json.jinja           J  extends @rkarakulov/config/tsconfig.library.json, paths @[[ npm_scope ]]/*
.githooks/pre-commit, pre-push          C  ← on-bike; pre-commit + `git diff --cached --check` (маркеры конфликтов copier update)
scripts/install-git-hooks.mjs           C  ← on-bike
infra/docker-compose.dev.yml.jinja      J  ← on-bike: name [[ project_slug ]]-dev; образ imresamu/postgis:18-3.6 при use_postgis, иначе postgres:18; Redis 8.8; Mailpit
.github/workflows/ci.yml.jinja          J  ← on-bike ci.yml; actions по SHA (как в ci.yml базы); permissions contents/packages: read;
                                           NODE_AUTH_TOKEN только на шаге install; образ PG по use_postgis; креды [[ db_name ]]; шаг «api dist loads»
AGENTS.md.jinja                         J  ← on-bike AGENTS.md без домена; §0–§10 по таблице plugin/README.md; §1 — заглушка; §4 — инварианты стека
                                           (без треков/GPS); §8 — индекс rules шаблона; правило «.ai/dev-kit и адаптеры не править — copier update»
CLAUDE.md                               C  тонкий указатель на AGENTS.md + имена компонентов плагина (`/app-dev-kit:develop-task`)
.claude/settings.json                   C  ← on-bike: allow/deny как есть, БЕЗ блока hooks; + extraKnownMarketplaces/enabledPlugins (plugin/README.md)
.claude/rules/{backend,db,contracts,app,web,tests,security}.md.jinja  J  ← on-bike rules без домена; mobile.md → app.md (apps/app/**);
                                           web.md — только admin; db.md — блок PostGIS под [% if use_postgis %]; security.md — paths без identity/media/landing
.ai/dev-kit/{README.md,commands/**,agents/**,skills/**,templates/**,docs/**}  G  копия plugin/ (без hooks/, scripts/, .claude-plugin/, README.md плагина)
.agents/skills/<имя>/SKILL.md           G  13 команд + 3 скила плагина: «прочитай .ai/dev-kit/docs/ai-runtime.md (`${CLAUDE_PLUGIN_ROOT}` = .ai/dev-kit),
                                           затем .ai/dev-kit/<commands|skills>/…»; description — из frontmatter плагина (экранирование YAML)
.codex/config.toml                      C  ← on-bike без имени проекта
.codex/agents/{architect,coder,reviewer,investigator}.toml  G  ← on-bike; ссылки на .ai/dev-kit/agents/*.md; reviewer ← independent-reviewer
tools/ai_review/{README.md,review_contract.md,codex_review.sh,codex_arch_review.sh}  C  ← on-bike; «on-bike monorepo» → «this monorepo (AGENTS.md §1)»
docs/README.md                          C  индекс (product/architecture — gap по соглашению)
docs/adr/0001-stack.md                  C  ← on-bike ADR-0001 + ADR-0004 без домена: стек и база app-foundation
docs/tasks/.gitkeep                     C
docs/runbooks/local-dev.md.jinja        J  ← on-bike runbook: токен реестра, infra, .env, db:migrate, dev, Mailpit, EAS-токен (как follow-up)
README.md.jinja                         J  кратко: что это, команды, ссылка на runbook и AGENTS.md
```

Исполнитель **B** (приложения и пакеты; образец — on-bike `apps/{api,mobile,admin}`, `packages/*`):
```
apps/api/package.json.jinja             J  ← on-bike без argon2/jose/@on-bike/tracks; devDep @rkarakulov/config вместо @on-bike/config
apps/api/{tsconfig.json,.swcrc,nest-cli.json}  C  tsconfig extends @rkarakulov/config/tsconfig.library.json, moduleResolution Bundler (комментарий F4 сохранить)
apps/api/drizzle.config.ts.jinja        J  URL по db_name; extensionsFilters ['postgis'] только при use_postgis
apps/api/vitest.config.mts.jinja        J  проекты unit/integration, условие @[[ npm_scope ]]/source
apps/api/.env.example.jinja             J  NODE_ENV, PORT, DATABASE_URL, REDIS_URL, TRUST_PROXY, SMTP_URL, MAIL_FROM "[[ project_name ]] <no-reply@example.com>"
apps/api/drizzle/0000_init.sql.jinja    J  [% if use_postgis %]CREATE EXTENSION IF NOT EXISTS postgis; --> statement-breakpoint[% endif %] + outbox
apps/api/drizzle/meta/{_journal.json,0000_snapshot.json}  C  сгенерировать drizzle-kit в отрендеренном проекте и перенести (snapshot не зависит от PostGIS)
apps/api/src/main.ts.jinja              J  configureHttpApp + API_VERSION из @scope/contracts
apps/api/src/{worker.ts,app.module.ts,worker.module.ts}  C  AppModule: Config, Clock, Database, Redis, Outbox, Queue, Health + фильтр;
                                           WorkerModule: Config, Clock, Database, Queue, Mail, Outbox, OutboxPublisherModule.forRoot({ routes: {} })
apps/api/src/config/{env.ts,env.test.ts}  C  defineEnv({ ...mailEnvShape }); тест — невалидный SMTP_URL/MAIL_FROM отклоняются
apps/api/src/db/{index.ts,schema.ts}    C  ← on-bike (реэкспорт outbox)
apps/api/src/queues.ts                  C  `QUEUE = {} as const` + правило идемпотентности в комментарии
apps/api/src/error-messages{,.test}.ts.jinja  J  PROJECT_ERROR_MESSAGES (Record<Exclude<ErrorCode, BaseErrorCode>, string> = {}), domainError; §8.1 п.5
apps/api/src/modules/health/{health.controller,health.service,health.controller.test}.ts.jinja  J  ← on-bike
apps/api/src/modules/health/{health.module,index}.ts  C
apps/api/test/{harness,test-env,harness.int.test}.ts.jinja  J  test-env по db_name; int-тест §8.1 п.5 (ветка PostGIS — под [% if %])
apps/api/test/{global-setup,db}.ts      C
apps/app/package.json.jinja             J  ← on-bike apps/mobile без auth-зависимостей (react-hook-form, @hookform, zustand, secure-store, playfair);
                                           + @expo-google-fonts/inter (§8.1 п.4); скрипты dev/ios/android/typecheck/test/doctor/build:preview
apps/app/app.json.jinja                 J  name/slug/scheme/bundleIdentifier/package; иконки и splash — стандартные ассеты Expo
apps/app/{eas.json,jest.setup.ts,.gitignore,.env.example,AGENTS.md,.claude/settings.json}  C  ← on-bike (setup без auth-сторов)
apps/app/{metro.config.js,jest.config.js,tsconfig.json}.jinja  J  условие @scope/source; jest — TZ не-UTC (§8.1 п.14), список из пресета
apps/app/assets/images/*                C  стандартные ассеты create-expo-app (icon, android-icon-*, splash-icon, favicon) — НЕ из on-bike
apps/app/src/theme/{design-system,fonts,fonts.test}.ts(.jinja)  J/C  configureDesignSystem({ themes, fonts, i18n }) бренда проекта
apps/app/src/app/{_layout,(tabs)/_layout,(tabs)/index,(tabs)/section}.tsx.jinja  J  Главная + раздел-заглушка с AsyncContent (данные — api.health)
apps/app/src/app/ui-kit.tsx             C  ← on-bike (только dev, Redirect в production)
apps/app/src/components/{screen-placeholder,tab-bar}.tsx.jinja  J  ← on-bike
apps/app/src/lib/{api,query-client,query-client.test}.ts.jinja  J  ← on-bike
apps/app/src/__tests__/{app-routes.ts,design-system-setup.test.ts,ui-kit.test.tsx}  C/J  сторож первого импорта — как on-bike
apps/app/src/__tests__/{tabs,section,root-layout}.test.tsx.jinja  J  вкладки, состояния AsyncContent, корневой layout без гардов auth
apps/admin/{package.json,index.html,vite.config.ts}.jinja  J  ← on-bike; title = project_name; без playfair
apps/admin/{tsconfig.json,public/favicon.svg,src/main.tsx,src/index.css}  C  tsconfig extends @rkarakulov/config/tsconfig.react.json; нейтральная иконка
apps/admin/src/{App,App.test,api,design-system,design-system.test,fonts}.ts(x)(.jinja)  J/C  designSystemCss({ theme: 'panel' }); заголовок — нейтральный ключ
packages/contracts/{package.json.jinja,tsconfig.json,tsconfig.build.json,src/{index,common,common.test,health}.ts}  J/C  defineErrorCodes([]), defineFieldErrorCodes([])
packages/api-client/{package.json,vitest.config.ts,src/index.ts}.jinja + {tsconfig*.json,src/index.test.ts}  J/C  только health
packages/i18n/{package.json.jinja,tsconfig*.json,src/{index,index.test}.ts,src/ru.ts.jinja}  J/C  baseLocale ru; ru.ts — строки проекта (вкладки, заглушки, admin)
packages/design-tokens/{package.json.jinja,tsconfig*.json,src/{index,brand,css,contrast,design-tokens.test}.ts}  C  brand.ts: themes = neutralThemes
                                           (или defineThemes поверх), fontStack; палитра из index НЕ экспортируется; тесты WCAG и CSS panel
```
Все `package.json` пакетов/приложений — `.jinja` (имя `@[[ npm_scope ]]/…`); `tsconfig*.json` пакетов — **C**
(`extends: "@rkarakulov/config/tsconfig.library.json"`).

### FILES TO MODIFY — база `app-foundation/` (исполнитель A)
- `package.json`: скрипты `template:sync` (`node scripts/sync-template-ai.mjs`), `template:check`
  (`node scripts/check-template.mjs`), `version-packages` (`changeset version && node scripts/sync-template-version.mjs`);
  в `check` — `node scripts/sync-template-ai.mjs --check && node scripts/sync-template-version.mjs --check` (без сети).
- `eslint.config.mjs`: `ignores: ['template/**']`. `.prettierignore`: `template`.
- `.github/workflows/ci.yml`: permissions + `packages: read`; job `template` — matrix `use_postgis: [false, true]`,
  services PG (`postgres:18` / `postgis/postgis:18-3.6`; `POSTGRES_USER/PASSWORD/DB` = `my_app` — значения
  `--defaults`, тогда `.env.example`, `test-env.ts` и `drizzle.config.ts` рендера работают без переопределений) и Redis 8.8 на 5432/6379,
  checkout `fetch-depth: 0` + `persist-credentials: false`, setup-node с `registry-url`/`scope`, `pipx run copier==9.19.1`
  (pipx есть на ubuntu-latest; без лишнего action), `pnpm template:check -- --data use_postgis=…`; `NODE_AUTH_TOKEN`
  только этому шагу. Шаг доменного grep по `template/` (кроме `.ai/`): `on-bike|onbike|Jersey|Night Ride|Протокол|
  Минск|Беларус|гонк|райд|трек|identity|tracks` → 0 совпадений. Шаг (только PR): изменились `template/**` или
  `copier.yml` без нового `.changeset/*.md` → ошибка. Job `template-update` (AC4): если есть тег `v*` с `copier.yml` —
  рендер с него, `git init`/commit, локальная правка, `copier update --defaults --vcs-ref HEAD`, проверки (ниже); иначе skip.
- `.github/workflows/release.yml`: `changesets/action` — `id: changesets`, `version: pnpm version-packages`; outputs
  `published`. Новый job `template-release` (`needs: release`, `if: published == 'true'`, permissions
  `contents: write`, `packages: read`, те же services): `pnpm template:check -- --strict` (точная версия, без фолбэка),
  затем `git tag "v$VERSION" && git push origin "v$VERSION"` (`VERSION` — из `packages/config/package.json`).
- `plugin/docs/ai-runtime.md`: в колонке Codex — «`${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit` проекта (копия плагина,
  обновляется `copier update`)»; `plugin/README.md` §Codex — то же; `plugin/.claude-plugin/plugin.json` — `0.1.1`.
- `README.md`: раздел «Новый проект» (`uvx copier copy gh:rkarakulov/app-foundation <dir>`, вопросы, git-доступ к
  приватному репо, токен, доступ CI к 8 пакетам), «Обновление» (`copier update --defaults`, `--vcs-ref`, конфликты,
  `copier check-update`), «Разработка шаблона» (`pnpm template:check`, `template:sync`, правило changeset, теги).
- `AGENTS.md`: §2 `template/` (+ §8.1 п.13), §3 новые команды, §4 инвариант: «правка `template/`/`copier.yml` — с
  changeset; `.ai/dev-kit` и адаптеры Codex — только `template:sync`».
- `.changeset/<slug>.md` — patch группы: «шаблон проекта copier».
- Новые: `scripts/{sync-template-ai,sync-template-version,check-template}.mjs`.

`scripts/check-template.mjs` (контракт): `--out <dir>` (по умолчанию `mkdtemp` в `os.tmpdir()`), `--data k=v`
(повторяемый), `--strict`, `--keep`. Шаги: (1) версия: `foundation_version` из `copier.yml`; опубликована ли
(`pnpm view @rkarakulov/config@<v> version --registry=https://npm.pkg.github.com`); нет и не `--strict` →
`-d foundation_version=<последняя опубликованная>` с предупреждением; (2) `copier copy --defaults --vcs-ref HEAD
--data … <база> <out>` (`uvx`/`pipx` — что найдётся); (3) `git init`, `pnpm install --no-frozen-lockfile`;
(4) `pnpm check` (адреса БД — значения по умолчанию рендера; env `DATABASE_URL_TEST`/`REDIS_URL_TEST`, если заданы); (5) `pnpm build`,
`node -e "require('reflect-metadata');require('./dist/app.module');require('./dist/worker.module')"` в apps/api;
(6) `cp apps/api/.env.example apps/api/.env`, `db:migrate` в dev-БД, старт `dist/main.js` → `GET /v1/health` = 200, старт `dist/worker.js` → жив ≥ 5 с,
оба гасятся; (7) `expo export --platform android` в apps/app. Выход ≠ 0 на любом шаге. CI и локальная проверка — один скрипт.

### FILES TO READ
- Образец: on-bike `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `eslint.config.mjs`, `.dependency-cruiser.cjs`,
  `.github/workflows/ci.yml`, `infra/docker-compose.dev.yml`, `.claude/{settings.json,rules/*}`, `tools/ai_review/*`,
  `.agents/skills/*`, `.codex/**`, `AGENTS.md`, `docs/runbooks/local-dev.md`, `apps/{api,mobile,admin}/**`, `packages/*`.
- База: `packages/config/eslint.js` (опции пресета), `packages/test-kit/src/{db,harness}.ts`,
  `packages/api-kit/src/{index.ts,outbox/outbox.module.ts}`, `packages/ui/src/{config.ts,theme/fonts.ts,
  components/async-content.tsx,components/ui-kit.tsx}`, `packages/design-tokens/src/neutral.ts`,
  `packages/contracts-core/src/errors.ts`, `plugin/README.md` (соглашение), `plugin/docs/ai-runtime.md`,
  `.github/workflows/{ci,release}.yml`, `scripts/smoke-consumer.mjs` (стиль скриптов), README базы п.5 (jest).
- copier: `configuring` (`_envops`, `_exclude`, `_skip_if_exists`, `when: false`, answers file), `updating`.

### TYPES & CONTRACTS
- Публичные API пакетов базы не меняются (кроме текста плагина и его версии). Контракты проекта: `HealthResponse`,
  `API_VERSION = 'v1'`, `ErrorCode`/`ApiError` = коды базы, `FieldErrorCode` = коды базы.
- Контракт шаблона для проектов (меняется только с changeset и описанием в README): имена вопросов `copier.yml`,
  `_answers_file`, вычисляемые `foundation_version`/`db_name`, разделители `[[ ]]`. Переименование вопроса ломает
  `copier update` у существующих проектов → только с `_migrations` (вне F3).

### TESTS / CHECKS
Отрендеренный проект (`pnpm check` + смоук `check-template.mjs`, матрица `use_postgis` false/true):
- api unit: env (mail-поля), error-messages (тексты кодов проекта, `domainError`), health controller (ok/degraded по
  контракту). api integration (реальные PG/Redis): стенд — `/v1/health` 200, `ENV`/`MAILER` в обоих графах, worker-граф
  с пустыми маршрутами outbox собирается, `reset()` чистит `outbox`; при PostGIS — `spatial_ref_sys` цел; миграции
  применяются на чистой `*_test`.
- contracts: состав и порядок `ErrorCode.options`/`FieldErrorCode.options` = коды базы; `HealthResponse`.
- api-client: health по схеме, сетевые и HTTP-ошибки различимы. i18n: `t`, нет дублей со словарём базы, слияние.
  design-tokens: WCAG-пары тем проекта, `designSystemCss({ theme: 'panel' })` содержит `--nav-*`.
- app (jest-expo): сторож первого импорта `_layout`; вкладки (2, выбор, тёмная тема); раздел с `AsyncContent`:
  скелетон на загрузке, «Нет соединения» при сети + повтор, «Не удалось загрузить» при 5xx, данные; витрина в dev,
  Redirect в production; шрифты: каждый `typography`-стиль → подключённый шрифт.
- admin (vitest/jsdom): заголовок сразу, скелетон, сеть/сервер/устаревшие данные с повтором; `installDesignSystem`.
- arch:check (dependency-cruiser) 0 нарушений; format/lint 0.
- Смоук: dist API грузится, API и worker стартуют, `/v1/health` 200, `expo export --platform android` собирается (AC2).
База: `pnpm check` (вкл. `template:sync --check`, `sync-template-version --check`), `pnpm build && pnpm smoke`,
`claude plugin validate --strict .`; негативные проверки вручную (в §12): правка файла в `plugin/` без sync →
`pnpm check` красный; шаблон с `{{ }}` в `.jinja`-TSX рендерится как есть.
AC3: доменный grep (выше) + ревью «нет кода пакетов базы» (нет `defineEnv(` вне `config/env.ts`, нет своих
`configureDesignSystem`/`createApiHarness`/`designSystemCss`-реализаций).
AC4 (`copier update`): в F3 — локально на двух коммитах ветки: `copier copy --vcs-ref <SHA слайса N>` → `git init`,
commit, правка `README.md` проекта → `copier update --defaults --vcs-ref HEAD` → нет `*.rej` и маркеров
(`git diff --check`), `_commit` в answers сменился, локальная правка цела, изменения шаблона применены,
`foundation_version`-строки каталога соответствуют HEAD. После первого тега — то же в CI (`template-update`).

### Порядок реализации (слайсы; A и B параллельно после S0)
- **S0 (A, блокирует B; ~маленький):** `copier.yml` с вопросами/`_envops`/вычисляемыми, answers-файл, корень
  (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.nvmrc`, `.editorconfig`, `.gitignore`, prettier,
  `eslint.config.mjs`, depcruise), ignore `template/` в базе, `scripts/check-template.mjs` (шаги 1–4).
  Проверка: `uvx copier copy --defaults --vcs-ref HEAD . $TMP/x` рендерит; `pnpm install` в `$TMP/x` проходит;
  `pnpm check` базы зелёный.
- **A1 (A):** infra + `ci.yml.jinja` + `.githooks` + docs/README. Проверка: рендер с `use_postgis=true/false` даёт
  правильный образ; `docker compose -f infra/docker-compose.dev.yml config` валиден; YAML CI парсится.
- **A2 (A):** `scripts/sync-template-ai.mjs` + `.ai/dev-kit`, `.agents`, `.codex` (G), `.claude/settings.json`,
  `.claude/rules/*`, `AGENTS.md.jinja`, `CLAUDE.md`, `tools/ai_review/*`, правка `plugin/docs/ai-runtime.md` и версии
  плагина. Проверка: `template:sync --check` зелёный, после правки плагина без sync — красный; `claude plugin validate
  --strict .`; в рендере `codex` видит адаптеры (`/skills`) — если Codex доступен, иначе NOT VERIFIED.
- **B1 (B):** `packages/{contracts,api-client,i18n,design-tokens}`. Проверка: рендер → `pnpm install` →
  `pnpm --filter "./packages/*" typecheck test`.
- **B2 (B):** `apps/api` (+ миграция 0000 сгенерировать drizzle-kit в рендере и перенести). Проверка: `pnpm infra:up`
  в рендере, `pnpm --filter @my-app/api test` (unit + integration), `build`, `db:migrate`, `/v1/health` 200, worker живёт;
  матрица `use_postgis`.
- **B3 (B):** `apps/app`. Проверка: `pnpm --filter @my-app/app typecheck test`, `expo export --platform android`.
- **B4 (B):** `apps/admin`. Проверка: `pnpm --filter @my-app/admin typecheck test build`.
- **S5 (A, после всех):** `check-template.mjs` шаги 5–7, CI базы (`template`, `template-update`, проверки changeset и
  домена), `release.yml` (`version-packages`, `template-release`), `sync-template-version.mjs`, changeset, README/AGENTS.md
  базы. Проверка: `pnpm template:check` целиком (обе ветки `use_postgis`) зелёный; AC4 локально на двух SHA; `pnpm check`,
  `pnpm build && pnpm smoke`, `claude plugin validate --strict .`.
Границы файлов: A — всё в `template/` вне `apps/**` и `packages/**`, плюс всё вне `template/`; B — только
`template/apps/**` и `template/packages/**`. Общие точки (каталог, скрипты пакетов, env) — по интерфейсу выше.
Коммиты A и B — по своим путям (`git add <пути>`), без правок чужой зоны.

### OUT OF SCOPE
F3b (принятие шаблона в on-bike, `.copier-answers.yml` там, переключение `.claude` на плагин); web/PWA/SSR (F5);
вход, роли, админ-кит (F6); `foundation:link`; `_migrations` copier; Renovate-конфиг; второй язык и выбор языка
(`expo-localization`); EAS-хук `eas-build-pre-install` с токеном (только упоминание в runbook); правка `textStyle`
базы под системные шрифты (§8.1 п.4 (c)); `actionlint` для workflow проекта; автотесты самих скриптов базы
(проверяются запуском и негативными проверками).

## 12. Outcome
Заполняет coder.
