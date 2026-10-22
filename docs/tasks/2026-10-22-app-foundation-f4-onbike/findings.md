# Findings — F4 (перевод on-bike на базу app-foundation)

Diff: `feature/app-foundation...feature/onbike-on-foundation` (c0adada..06450c1).

## Codex — pass 1 — APPROVE (`findings-codex.md`)

| Severity | Находка | Статус |
|---|---|---|
| MEDIUM | Нет инструкции доступа к пакетам для EAS Build | fixed (e252978): runbook — секрет `NODE_AUTH_TOKEN` и хук `eas-build-pre-install`; настройка — follow-up человека |
| MEDIUM | `security.md` `paths:` без `src/db/**`, `.npmrc`, `pnpm-workspace.yaml`, workflows | fixed (e252978) |

## Claude independent-reviewer — pass 1 — APPROVE

| Severity | Находка | Статус |
|---|---|---|
| MEDIUM | `docs/architecture/README.md` ссылается на удалённый `infra/outbox` | fixed |
| MEDIUM | Рантайм CJS-сборки `dist` (require(esm), две сборки drizzle) не проверяется в CI | fixed: шаг CI «api dist loads» — загрузка `dist/app.module` и `dist/worker.module` |
| LOW | Импорт настройки дизайн-системы в `_layout.tsx` не защищён тестом | fixed: `__tests__/design-system-setup.test.ts` — первый импорт корня |
| LOW | ESLint не запрещает `@rkarakulov/design-tokens` в приложениях (обход бренда) | fixed: `no-restricted-imports` |
| LOW | `.claude/rules/web.md` расходится с AGENTS.md §4.11 | fixed: бренд — `@on-bike/design-tokens`, общий токен — задачей в app-foundation |

Проверено ревьюером: перенос 1 в 1 (удалённые копии vs `@rkarakulov/*@0.1.0`, CSS и словарь — без расхождений), тесты-дубли
покрыты базой не меньшим числом, `ZodValidationPipe` с кодами on-bike во всех 4 местах, gitleaks чист, `db:generate` —
без изменений, `setup-node` + pnpm 11 читают пакеты.

NOT VERIFIED: AC4 (смоук Android, человек), AC5 (CI на GitHub — после push), iOS-пикер `locale="ru"`, EAS Build.
