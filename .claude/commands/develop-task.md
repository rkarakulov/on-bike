---
description: Оркестратор задачи on-bike — UNDERSTAND → SPEC → PLAN → IMPLEMENT (TDD) → VERIFY → INDEPENDENT REVIEW → FIX → RE-REVIEW → FINISH. Fast path для мелкого багфикса.
argument-hint: <описание задачи | путь к task.md> [--fast] [--no-codex]
---

> **Runtime:** сначала прочитай `.claude/ai-runtime.md` — там модели, tools и независимое ревью для Claude Code и Codex. Фазы ниже от инструмента не зависят.

# /develop-task

Задача: $ARGUMENTS

Тонкий оркестратор: маршрутизирует к командам, агентам и superpowers, логику фаз не дублирует.
Канон — `AGENTS.md`. Safety (`AGENTS.md` §7) действует на всех шагах.

Аргумент — путь к существующему task.md → продолжи с фазы, зафиксированной в нём (разделы 8/11/12), не начинай заново.

## Шаг 0 — классификация

- **Fast path:** очевидный локальный багфикс или механическая правка, контракты и поведение не меняются.
- **Полный цикл:** фича, смена поведения, несколько модулей, миграции, контракты, безопасность.

Не уверен — полный цикл, и скажи об этом.

### Fast path

1. `superpowers:systematic-debugging` — найди корень, не симптом.
2. Падающий тест → минимальное исправление (`/task1`).
3. `/verify-task`.
4. `/review-task` (независимое ревью).
5. `/finish-task`.

Оказалось сложнее — поднимись в полный цикл.

## Полный цикл

1. **UNDERSTAND** — `/understand-project` с фокусом на задачу.
2. **SPEC** — `/create-spec` → task.md (разделы 1–4, 8, 8.1, 9).
   **⏸ HUMAN GATE**, если есть неоднозначность или меняется продуктовое поведение: покажи spec, жди явного «ок».
3. **PLAN** — выбери уровень и делегируй:
   - понятная задача с планом → `/task2`;
   - несколько модулей / миграции / контракты / безопасность → `/task3` (architect → coder → reviewer).
   Большой scope → декомпозиция на независимые task.md, по очереди через цикл.
4. **IMPLEMENT** — внутри выбранного уровня; TDD; только scope.
5. **VERIFY** — `/verify-task`: реальный вывод `pnpm check`.
6. **INDEPENDENT REVIEW** — `/review-task` (Claude `independent-reviewer` и/или `/codex-review`). Первый проход — только findings.
7. **FIX** — автор правит только подтверждённые CRITICAL/HIGH (`superpowers:receiving-code-review`: проверь замечание, оспорь с доказательством, если оно неверно).
8. **RE-REVIEW** — новый проход ревью на новом diff; повторять до `APPROVE`.
9. **FINISH** — `/finish-task`: DoD, `pr.md`, коммит в рабочую ветку, draft-PR по согласию человека.

## Human gates

- После SPEC — при неоднозначности или смене продуктового поведения.
- Перед push, merge, деплоем, деструктивной миграцией, сменой секретов — всегда.

## Итог

```
### /develop-task: <slug>
- Путь: fast | полный (task1/2/3)
- task.md: <путь>
- Human gate: пройден | пропущен (почему)
- Реализация: <что изменено>
- Проверки: <команда → результат> | NOT VERIFIED (почему)
- Ревью: <claude | codex | оба> — CRITICAL N / HIGH N / MEDIUM N / LOW N, вердикт
- PR: <ветка, draft-PR или «не создан»>
- Открыто: <follow-ups>
```
