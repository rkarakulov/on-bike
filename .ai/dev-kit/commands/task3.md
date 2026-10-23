---
description: Уровень 3 — сложная задача. Brainstorming → task.md → architect → coder → независимый reviewer → гейты оркестратора.
argument-hint: <описание задачи>
---

> **Runtime:** сначала прочитай `${CLAUDE_PLUGIN_ROOT}/docs/ai-runtime.md`.

# /task3 — полный конвейер

Задача: $ARGUMENTS

## 0. Brainstorming (обязательно)

`superpowers:brainstorming` + Requirements Sanity Check. На выходе: что и зачем, scope / out of scope,
acceptance, open questions, проблемы в требованиях и решения по ним.

## 1. task.md

При 3+ модулях — `superpowers:writing-plans`. Создай `docs/tasks/<YYYY-MM-DD>-<slug>/task.md` по
`${CLAUDE_PLUGIN_ROOT}/templates/task-template.md`, все разделы до 11. Зона безопасности → security checklist.

## 2. Architect

Агент `architect` с абсолютным путём к task.md: placement, reuse, contracts, данные, очереди,
безопасность, Requirements Consistency, Implementation Context. `BLOCKERS` — к coder не переходить.

## 3. Coder

Агент `coder` с путём к task.md и подтверждёнными решениями. TDD, `pnpm check`, раздел 12.

## 4. Независимое ревью

Свежий `independent-reviewer`: исходное требование, путь к task.md, base, список файлов.
Историю и выводы coder **не передавай**. Дополнительно — `/codex-review`.
`REQUEST CHANGES` → coder исправляет подтверждённое → новый проход. До `APPROVE`.

## 5. Гейты оркестратора (сам, не по отчётам агентов)

1. Сам прогони `pnpm check`, приведи хвост вывода.
2. Documentation Sync: `git diff --name-only -- docs/` против раздела 10.
3. Раздел 12 заполнен, findings.md без открытых CRITICAL/HIGH.
4. `/finish-task`.

## Итог

task.md · итог architect · итог coder · итог ревью (инструмент, вердикт) · свой прогон `pnpm check` · открытое.
