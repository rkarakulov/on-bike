---
description: Кросс-движковое независимое ревью через Codex CLI (read-only) по контракту tools/ai_review/review_contract.md. Fallback — агент independent-reviewer.
argument-hint: --task <путь к task.md> [--base <branch>]
---

> **Runtime:** сначала прочитай `.claude/ai-runtime.md`.

# /codex-review

Аргументы: $ARGUMENTS

Запусти (в фоне, дождись завершения):

```bash
tools/ai_review/codex_review.sh --task <task.md> [--base main] [--out <findings.md>]
```

| Код | Значение | Что делать |
|---|---|---|
| 0 | findings записаны | прочитай findings.md, классифицируй, продолжай цикл |
| 2 | нет diff / неверные аргументы | проверь base и аргументы; ревьюить нечего — так и скажи |
| 3 | Codex CLI нет | fallback: свежий `independent-reviewer`, отметь «ревью не кросс-движковое» |
| 4 | codex exec упал или пусто | то же, что 3; ошибку авторизации/лимитов не называть успешным ревью |

Codex-ревью — дополнительный взгляд, не замена `independent-reviewer` в `/task2`/`/task3`.
Внутри Codex-сессии не вызывай этот скрипт рекурсивно — независимость даёт свежий reviewer.
