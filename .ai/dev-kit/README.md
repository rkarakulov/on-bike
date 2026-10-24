# .ai/dev-kit — плагин app-dev-kit 0.1.2 для Codex

Копия текстов плагина Claude Code `app-dev-kit` (`commands/`, `agents/`, `skills/`, `templates/`, `docs/`).
Codex плагины не загружает: адаптеры `.agents/skills/*` и роли `.codex/agents/*.toml` читают тексты отсюда,
а `${CLAUDE_PLUGIN_ROOT}` в них означает `.ai/dev-kit`. Claude Code берёт тот же процесс из плагина
(`.claude/settings.json` → `enabledPlugins`), эту копию не читает.

Сгенерировано `scripts/sync-template-ai.mjs` базы app-foundation из плагина app-dev-kit — не править: обновляется `copier update`.
