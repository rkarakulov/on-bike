---
description: Шаг SPEC — из сырой задачи сделать проверяемую спецификацию в task.md. Clarify через brainstorming, human gate.
argument-hint: <описание задачи>
---

> **Runtime:** сначала прочитай `${CLAUDE_PLUGIN_ROOT}/docs/ai-runtime.md`.

# /create-spec

Задача: $ARGUMENTS

Не выдумывай неизвестные продуктовые требования: неясное — в Open Questions или вопрос человеку.
Сверяйся с продуктовыми документами проекта (`docs/product/`: PRD, epics, архитектурный спайн — по карте
`AGENTS.md` §9); нет нужного документа — зафиксируй gap.

1. **Clarify** — `superpowers:brainstorming` при любой неоднозначности. Короткие вопросы с вариантами.
2. **Requirements Sanity Check** — противоречия в источнике, конфликт с инвариантами `AGENTS.md` §4,
   недоопределённость, вредные решения. Каждая находка — с 2–3 альтернативами и рекомендацией.
3. **Спецификация** в `docs/tasks/<YYYY-MM-DD>-<slug>/task.md` (шаблон
   `${CLAUDE_PLUGIN_ROOT}/templates/task-template.md`):
   Goal, Scope, Out of Scope, FR-1…, Acceptance (по одному на критичное поведение), Edge cases,
   Risks / Assumptions / Open Questions, 8.1 Requirements Consistency.
   Затронутые приложение / модуль зафиксируй сразу; Placement gate (5.1) дозаполняется на PLAN.

## ⏸ HUMAN GATE

Покажи spec и жди явного «ок», если есть неоднозначность или меняется продуктовое поведение.
Для очевидного локального багфикса — пропусти, отметив это.
