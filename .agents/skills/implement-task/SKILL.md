---
name: implement-task
description: 'Шаг IMPLEMENT — реализация строго по task.md через агента coder с TDD, без unrelated-рефакторинга.'
---

# implement-task

Прочитай `.ai/dev-kit/docs/ai-runtime.md` (для Codex `${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`), затем `.ai/dev-kit/commands/implement-task.md` от корня репозитория и выполни сценарий
с аргументами текущего запроса. Используй модели и tools Codex; Claude не запускай.
Сохраняй гейты и артефакты исходного файла.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
