---
name: codex-review
description: 'Кросс-движковое независимое ревью через Codex CLI (read-only) по контракту tools/ai_review/review_contract.md проекта. Fallback — агент independent-reviewer.'
---

# codex-review

Прочитай `.ai/dev-kit/docs/ai-runtime.md` (для Codex `${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`), затем `.ai/dev-kit/commands/codex-review.md` от корня репозитория и выполни сценарий
с аргументами текущего запроса. Используй модели и tools Codex; Claude не запускай.
Сохраняй гейты и артефакты исходного файла.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
