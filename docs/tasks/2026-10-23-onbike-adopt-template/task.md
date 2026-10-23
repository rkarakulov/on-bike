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
Заполняет architect.

## 8.2 Deviations from spec
- Переименование `apps/mobile` → `apps/app` — решение автора (автономный режим): иначе `copier update` будет создавать в
  on-bike параллельный `apps/app`.

## 8.3 Security checklist
Затронуты `.claude/settings.json` (deny-лист), CI, `.npmrc`, `infra/`. Deny-лист после F3b не слабее текущего (diff),
`.npmrc` без токена, CI — те же права и SHA, секретов в файлах нет (gitleaks).

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

## 11. Implementation Context
Заполняет architect.

## 12. Outcome
Заполняет coder.
