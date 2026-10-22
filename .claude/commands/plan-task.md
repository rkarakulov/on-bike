---
description: Шаг PLAN — по утверждённой spec получить план реализации через агента architect, заполнить placement gate, test matrix, Implementation Context; декомпозиция большого scope.
argument-hint: <путь к task.md>
---

> **Runtime:** сначала прочитай `.claude/ai-runtime.md`.

# /plan-task

Вход: $ARGUMENTS — только утверждённая spec.

1. Агент `architect` с абсолютным путём к task.md (проверяет кодом, не угадывает).
2. Заполни в task.md: 5 Architecture Context, 5.1 Placement & Reuse Gate (без него coder не запускается),
   6 Relevant Files, 10 Documentation Impact, 11 Implementation Context.
3. **Test matrix:** unit / интеграционные на реальной БД / e2e; фикстуры треков при работе с tracks.
4. **Decompose** при большом scope: независимые задачи (что меняется, файлы, acceptance, тесты — не пусто,
   зависимости и порядок). Каждая — свой task.md.

Выход: task.md, готовый к реализации, или набор task.md + порядок.
