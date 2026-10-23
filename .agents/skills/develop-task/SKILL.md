---
name: develop-task
description: 'Оркестратор задачи — UNDERSTAND → SPEC → PLAN → IMPLEMENT (TDD) → VERIFY → INDEPENDENT REVIEW → FIX → RE-REVIEW → FINISH. Fast path для мелкого багфикса.'
---

# develop-task

Прочитай `.ai/dev-kit/docs/ai-runtime.md` (для Codex `${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`), затем `.ai/dev-kit/commands/develop-task.md` от корня репозитория и выполни сценарий
с аргументами текущего запроса. Используй модели и tools Codex; Claude не запускай.
Сохраняй гейты и артефакты исходного файла.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
