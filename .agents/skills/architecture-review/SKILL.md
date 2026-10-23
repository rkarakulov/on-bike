---
name: architecture-review
description: 'Периодический read-only аудит архитектуры проекта → .architecture/ (debt register со стабильными ARCH-ID, задачи для /develop-task). Запускать, когда кодовая база вырастет (ориентир — несколько эпиков в коде).'
---

# architecture-review

Прочитай `.ai/dev-kit/docs/ai-runtime.md` (для Codex `${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`), затем `.ai/dev-kit/commands/architecture-review.md` от корня репозитория и выполни сценарий
с аргументами текущего запроса. Используй модели и tools Codex; Claude не запускай.
Сохраняй гейты и артефакты исходного файла.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
