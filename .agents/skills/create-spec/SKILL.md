---
name: create-spec
description: 'Шаг SPEC — из сырой задачи сделать проверяемую спецификацию в task.md. Clarify через brainstorming, human gate.'
---

# create-spec

Прочитай `.ai/dev-kit/docs/ai-runtime.md` (для Codex `${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`), затем `.ai/dev-kit/commands/create-spec.md` от корня репозитория и выполни сценарий
с аргументами текущего запроса. Используй модели и tools Codex; Claude не запускай.
Сохраняй гейты и артефакты исходного файла.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
