---
description: Финал задачи — Definition of Done, pr.md, коммит в рабочую ветку, draft-PR через gh. Push и merge — только с явного согласия человека.
argument-hint: <путь к task.md>
---

> **Runtime:** сначала прочитай `${CLAUDE_PLUGIN_ROOT}/docs/ai-runtime.md`.

# /finish-task

Вход: $ARGUMENTS

## Definition of Done (все пункты)

1. Перечитай task.md; каждый acceptance criterion — выполнен, с доказательством.
2. Просмотри весь diff: нет отладочного кода, случайных файлов, секретов.
3. `/verify-task` → `VERIFIED`. Иначе `NOT VERIFIED`, задача не завершена.
4. findings.md: последний проход `APPROVE`, нет открытых CRITICAL/HIGH.
5. Placement и границы соблюдены (`pnpm arch:check` в составе `pnpm check`, если проект его ведёт).
6. Docs по разделу 10 обновлены; раздел 12 (Outcome) заполнен.
7. Миграции, env, конфиги, новые зависимости — явно описаны.

## pr.md (рядом с task.md)

Title · Summary · Motivation · Changes (по областям) · Testing (команды и результат) ·
Migrations / Env / Config · Risks · Acceptance checklist · Review summary (из findings.md).

## Git

1. Убедись, что ты на `feature/<slug>` / `fix/<slug>`, не на `main`.
2. `git add <конкретные пути>` (не `-A`), коммит: короткая строка по-русски о сути изменения + тело при необходимости.
3. Спроси человека: «Пушить ветку и открыть draft-PR?» Только после «да»:
   `git push -u origin <branch>` и `gh pr create --draft --title … --body-file <pr.md>`.
4. Merge, деплой, force push — никогда без отдельного явного решения человека.

## Выход

Статус: `DONE (commit <sha>, PR <url> | PR не создан)` или `BLOCKED` + что осталось.
