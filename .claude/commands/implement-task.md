---
description: Шаг IMPLEMENT — реализация строго по task.md через агента coder с TDD, без unrelated-рефакторинга.
argument-hint: <путь к task.md>
---

> **Runtime:** сначала прочитай `.claude/ai-runtime.md`.

# /implement-task

Вход: $ARGUMENTS

## Предусловия

- В task.md заполнены 5.1 Placement & Reuse Gate и 11 Implementation Context.
- Рабочая ветка `feature/<slug>` (или `fix/<slug>`); параллельные сессии — отдельный worktree
  (`superpowers:using-git-worktrees`).

## Что сделать

1. Агент `coder` с абсолютным путём к task.md.
2. TDD: тест падает до реализации и проходит после.
3. Scope discipline: расползается — остановиться и доложить.
4. Правила зоны (`.claude/rules/*`): contracts-first, серверный авторитет, append-only, i18n, токены.

Выход: код + тесты + docs по разделу 10 + отчёт coder.
