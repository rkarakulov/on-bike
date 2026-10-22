# CLAUDE.md

Канон проекта — [`AGENTS.md`](AGENTS.md). Прочитай его первым; здесь только навигация для Claude Code.

## Ассеты `.claude/`

| Путь | Назначение |
|---|---|
| `.claude/commands/develop-task.md` | оркестратор задачи, точка входа |
| `.claude/commands/task1.md` … `task3.md` | уровни реализации |
| `.claude/commands/{create-spec,plan-task,implement-task,verify-task,review-task,finish-task}.md` | фазы цикла |
| `.claude/commands/understand-project.md` | контекст-брифинг под задачу |
| `.claude/commands/codex-review.md` | кросс-движковое ревью через Codex |
| `.claude/commands/architecture-review.md` | периодический аудит (когда кодовая база вырастет) |
| `.claude/agents/{architect,coder,independent-reviewer,investigator}.md` | роли субагентов |
| `.claude/skills/{backend-nest,web-ui,mobile-expo}/` | процесс по зонам |
| `.claude/rules/*.md` | правила по путям (`paths:` frontmatter) |
| `.claude/task-template.md` | шаблон task.md |
| `.claude/ai-runtime.md` | соответствие Claude ↔ Codex |
| `.claude/hooks/completion-gate.sh` | Stop-хук, advisory |
| `tools/ai_review/` | контракт ревью, Codex-мосты |

## Уровень задачи → superpowers

| Уровень | Скилы |
|---|---|
| fast path (багфикс) | `systematic-debugging` → `test-driven-development` → `verification-before-completion` |
| task1 | `verification-before-completion` |
| task2 | `brainstorming` (если размыто) → `test-driven-development` → `verification-before-completion` |
| task3 | `brainstorming` (обязательно) → `writing-plans` → `subagent-driven-development` / `test-driven-development` → `receiving-code-review` → `verification-before-completion` → `finishing-a-development-branch` |

Документацию библиотек (NestJS, Expo, Drizzle, Astro, BullMQ, MapLibre …) сверяй через context7, а не по памяти.
