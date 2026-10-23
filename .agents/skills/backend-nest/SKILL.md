---
name: backend-nest
description: 'Обязательный процесс для любой backend-работы в apps/api проекта на стеке app-foundation (NestJS 12 на Fastify, Drizzle, PostgreSQL, Redis, BullMQ, outbox, инфраструктура @rkarakulov/api-kit). Применяй, когда добавляешь или меняешь endpoint, controller, service, repository, модуль, миграцию, задачу очереди, outbox-событие, auth/роли, загрузку файлов, письмо, конфиг. Форсирует порядок placement → reuse → контракт → данные → очередь → TDD до написания кода.'
---

# backend-nest

Прочитай `.ai/dev-kit/docs/ai-runtime.md` (для Codex `${CLAUDE_PLUGIN_ROOT}` = `.ai/dev-kit`), затем `.ai/dev-kit/skills/backend-nest/SKILL.md` от корня репозитория и выполни сценарий
с аргументами текущего запроса. Используй модели и tools Codex; Claude не запускай.
Сохраняй гейты и артефакты исходного файла.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
