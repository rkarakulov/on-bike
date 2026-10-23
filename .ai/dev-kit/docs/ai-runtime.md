# Claude Code ↔ Codex: общий процесс

Процесс поставляет плагин `app-dev-kit`: фазы — его команды (`${CLAUDE_PLUGIN_ROOT}/commands/`),
роли — агенты (`${CLAUDE_PLUGIN_ROOT}/agents/`), процессы зон — скилы (`${CLAUDE_PLUGIN_ROOT}/skills/`).
Правила проекта — в `AGENTS.md` и `.claude/rules/` **проекта**. Этот файл описывает только адаптацию к
инструменту. Имя каталога `.claude` не привязывает инструкции к моделям Anthropic.

## Имена компонентов плагина

В текстах плагина команды, агенты и скилы названы коротко. Вызывай их полным именем с префиксом плагина:

| В тексте | Вызов в Claude Code |
|---|---|
| `/develop-task`, `/task2`, `/verify-task`, … | `/app-dev-kit:develop-task`, … (Skill tool: `app-dev-kit:<имя>`) |
| агент `architect`, `coder`, `independent-reviewer`, `investigator` | `Agent` с `subagent_type: "app-dev-kit:<имя>"` |
| скил зоны `backend-nest`, `mobile-expo`, `web-ui` | `app-dev-kit:<имя>` |
| шаблон task.md | `${CLAUDE_PLUGIN_ROOT}/templates/task-template.md` |
| шаблон архитектурного аудита | `${CLAUDE_PLUGIN_ROOT}/templates/architecture-review-template.md` |

## Соответствие

| Понятие | Claude Code | Codex |
|---|---|---|
| Точка входа | `CLAUDE.md` → `AGENTS.md` | `AGENTS.md` |
| Процесс | плагин `app-dev-kit` | плагинов нет — адаптеры и тексты фаз приходят шаблоном проекта |
| Корень плагина `${CLAUDE_PLUGIN_ROOT}` | каталог установленного плагина | `.ai/dev-kit` проекта (копия плагина, обновляется `copier update`) |
| Команда | `/app-dev-kit:develop-task …` | `$develop-task …` (адаптеры в `.agents/skills/`) |
| Роли | `Agent` tool, агенты плагина | субагенты из `.codex/agents/*.toml` |
| Модель | из настроек Claude Code | из `.codex/config.toml` или `codex -m` |
| Плагин superpowers | скилы `superpowers:*` | нет — выполни фазу вручную тем же способом |
| Plan mode | `EnterPlanMode` / `ExitPlanMode` | встроенное планирование; утверждение у человека |
| Фон / ожидание | `run_in_background`, уведомления | tools ожидания процесса |
| MCP | `.mcp.json` | `.codex/config.toml` |

`$ARGUMENTS` — аргументы текущего запроса. `@path` — прочитать файл.
`Agent({...})`, `subagent_type`, `model: inherit` — синтаксис Claude; в Codex это значит «запусти
соответствующую роль Codex», а не «вызови Claude».

## Делегирование

- `/task3`: architect → coder → reviewer строго последовательно; `BLOCKERS` у architect — coder не запускать.
- `/task2`: реализация inline, ревью — отдельный свежий reviewer.
- Reviewer всегда в **свежем контексте**: исходное требование, путь к task.md, base, список файлов.
  Историю и выводы coder не передавать. Нет независимой сессии — так и напиши; self-review не выдавай
  за независимое ревью.

## Независимое ревью

| Кто писал код | Кто ревьюит |
|---|---|
| Claude | `independent-reviewer` (Claude) и/или `tools/ai_review/codex_review.sh` (Codex) |
| Codex | свежий reviewer Codex; при желании — Claude `independent-reviewer` по тому же контракту |

Контракт один — `tools/ai_review/review_contract.md` проекта. Первый проход — findings-only.
Вложенный `codex exec` не запускает workflow разработки рекурсивно.
Ошибка авторизации или лимитов CLI ≠ успешное ревью.

## Смена инструмента посреди задачи

Перед выходом зафиксируй в task.md (разделы 8, 11, 12): фазу, принятые решения, base, свои файлы,
результаты проверок, следующий шаг. Новая сессия продолжает: `$develop-task продолжи docs/tasks/…/task.md`
(в Claude Code — `/app-dev-kit:develop-task docs/tasks/…/task.md`).
История чатов между Claude и Codex не переносится.

## Проверка настройки Codex

Запускать из корня репозитория (проект должен быть доверенным):

```bash
codex --version
codex features list
codex
```

В сессии `/skills` должен показать адаптеры из `.agents/skills/`. Синтаксис конфигов ≠ работающий
конвейер: проверяется реальной задачей с architect → coder → reviewer и `pnpm check`.
