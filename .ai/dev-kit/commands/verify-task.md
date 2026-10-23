---
description: Шаг VERIFY — прогнать реальные гейты проекта по затронутому diff. Только существующие команды, только evidence.
argument-hint: [base-branch]
---

> **Runtime:** сначала прочитай `${CLAUDE_PLUGIN_ROOT}/docs/ai-runtime.md`.

# /verify-task

Дисциплина `superpowers:verification-before-completion`: никаких «passing» без вывода команды.

## Команды

Имена пакетов и скрипты — из `AGENTS.md` §3 проекта; ниже — что прогнать, а не точные имена.

1. Всегда: `pnpm check` (completion gate проекта: lint + typecheck + test + format:check и прочее, что в него входит).
2. По затронутым путям (`git diff --name-only <base>...HEAD` + рабочее дерево):
   - `apps/api/**`, миграции → интеграционные тесты на реальной БД (`pnpm infra:up`, затем тесты
     пакета API через `pnpm --filter <api-пакет> test`); миграции — на чистой базе.
   - `apps/admin/**` → `pnpm --filter <admin-пакет> build`.
   - `apps/app/**` (универсальное Expo-приложение) → typecheck и тесты пакета приложения; web/SSR-сборка,
     если в `AGENTS.md` §3 есть скрипт; сборку EAS не запускать.
   - пакет контрактов (`packages/contracts/**` или по `AGENTS.md` §2) → typecheck всех потребителей
     (входит в `pnpm check`).
3. Нет скрипта — не выдумывай, напиши «нет команды».

## Выход

По каждой команде — pass/fail + хвост вывода. Итог: `VERIFIED` или `NOT VERIFIED` + что красное
или не запускалось (например, нет Docker). Падения, не связанные с задачей, — отдельно, явно.
