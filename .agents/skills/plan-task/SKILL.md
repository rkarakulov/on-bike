---
name: plan-task
description: 'Шаг PLAN — по утверждённой spec получить план реализации через агента architect, заполнить placement gate, test matrix, Implementation Context; декомпозиция большого scope.'
---

# plan-task

Прочитай `.ai/dev-kit/docs/ai-runtime.md` (для Codex `${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`), затем `.ai/dev-kit/commands/plan-task.md` от корня репозитория и выполни сценарий
с аргументами текущего запроса. Используй модели и tools Codex; Claude не запускай.
Сохраняй гейты и артефакты исходного файла.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
