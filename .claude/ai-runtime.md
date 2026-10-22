# Claude Code ↔ Codex: общий процесс

Фазы, шаблоны и критерии — в `.claude/commands/`, роли — в `.claude/agents/`, правила — в
`AGENTS.md` и `.claude/rules/`. Этот файл описывает только адаптацию к инструменту.
Имя каталога `.claude` не привязывает инструкции к моделям Anthropic.

## Соответствие

| Понятие | Claude Code | Codex |
|---|---|---|
| Точка входа | `CLAUDE.md` → `AGENTS.md` | `AGENTS.md` |
| Команда | `/develop-task …` | `$develop-task …` (адаптеры в `.agents/skills/`) |
| Роли | `Agent` tool, `.claude/agents/*.md` | субагенты из `.codex/agents/*.toml` (указывают на те же `.md`) |
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

Контракт один — `tools/ai_review/review_contract.md`. Первый проход — findings-only.
Вложенный `codex exec` не запускает workflow разработки рекурсивно.
Ошибка авторизации или лимитов CLI ≠ успешное ревью.

## Смена инструмента посреди задачи

Перед выходом зафиксируй в task.md (разделы 8, 11, 12): фазу, принятые решения, base, свои файлы,
результаты проверок, следующий шаг. Новая сессия продолжает: `$develop-task продолжи docs/tasks/…/task.md`.
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
