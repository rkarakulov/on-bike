---
description: Шаг VERIFY — прогнать реальные гейты проекта по затронутому diff. Только существующие команды, только evidence.
argument-hint: [base-branch]
---

> **Runtime:** сначала прочитай `.claude/ai-runtime.md`.

# /verify-task

Дисциплина `superpowers:verification-before-completion`: никаких «passing» без вывода команды.

## Команды

1. Всегда: `pnpm check` (lint + typecheck + test + arch:check + format:check).
2. По затронутым путям (`git diff --name-only <base>...HEAD` + рабочее дерево):
   - `apps/api/**`, миграции → интеграционные тесты на реальной БД (`pnpm infra:up`, затем
     `pnpm --filter @on-bike/api test`); миграции — на чистой базе.
   - `apps/admin/**`, `apps/landing/**` → `pnpm --filter <pkg> build`.
   - `apps/mobile/**` → `pnpm --filter @on-bike/mobile typecheck` и тесты; сборку EAS не запускать.
   - `packages/contracts/**` → typecheck всех потребителей (входит в `pnpm check`).
3. Нет скрипта — не выдумывай, напиши «нет команды».

## Выход

По каждой команде — pass/fail + хвост вывода. Итог: `VERIFIED` или `NOT VERIFIED` + что красное
или не запускалось (например, нет Docker). Падения, не связанные с задачей, — отдельно, явно.
