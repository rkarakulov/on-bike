---
description: Уровень 2 — план → утверждение → task.md → реализация inline → независимый reviewer.
argument-hint: <описание задачи>
---

> **Runtime:** сначала прочитай `${CLAUDE_PLUGIN_ROOT}/docs/ai-runtime.md`.

# /task2 — план и реализация

Задача: $ARGUMENTS

## 1. План

- Размыто — сначала `superpowers:brainstorming`.
- Войди в Plan mode. Requirements Sanity Check (`AGENTS.md` §5): находки — отдельным разделом с рекомендацией.
- План: placement, reuse points, файлы, изменения contracts, миграции, задачи очереди, тесты,
  acceptance, documentation impact, риски. Затронута зона безопасности — security checklist (`.claude/rules/security.md`).
- Выйди из Plan mode и **дождись утверждения**.

## 2. task.md

Сохрани план в `docs/tasks/<YYYY-MM-DD>-<slug>/task.md` по `${CLAUDE_PLUGIN_ROOT}/templates/task-template.md`.
Обязательно: 5.1 Placement & Reuse Gate, 9 Acceptance, 10 Documentation Impact, 11 Implementation Context.

## 3. Реализация (inline)

- `superpowers:test-driven-development` — тест до кода.
- Contracts-first, правила зоны, скил зоны (`backend-nest` / `web-ui` / `mobile-expo`).
- `pnpm check` зелёный.

## 4. Независимое ревью (обязательно)

Свежий `independent-reviewer` без твоей истории: передай путь к task.md, base и список файлов.
Дополнительно можно `/codex-review`. `REQUEST CHANGES` → исправь подтверждённое → повторный проход.
Пропуск допустим только для чисто механической правки — запиши обоснование в раздел 12.

## 5. Done

`superpowers:verification-before-completion` → раздел 12 (Outcome) → `/finish-task`.

## Поднять уровень

Нужен архитектурный разбор до кода (несколько модулей, миграции, новые контракты) — `/task3`.
