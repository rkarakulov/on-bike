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

## 5.1 Placement & Reuse Gate
- Код в шаблоне — только композиция и тонкие слои; всё общее — пакеты базы (не копировать код пакетов в шаблон).
- Источник образца — on-bike после F4 (без домена: identity, tracks, тексты продукта).
- Тексты фаз для Codex — генерируются из `plugin/`, руками не правятся.

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
Заполняет architect.

## 8.2 Deviations from spec

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

## 11. Implementation Context
Заполняет architect.

## 12. Outcome
Заполняет coder.
