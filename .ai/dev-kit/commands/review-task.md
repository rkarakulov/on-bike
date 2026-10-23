---
description: Шаг INDEPENDENT REVIEW — findings-first ревью diff без авто-фикса (Claude independent-reviewer и/или Codex) → findings.md. Повторный вызов = re-review.
argument-hint: <путь к task.md> [--base <branch>] [--no-codex]
---

> **Runtime:** сначала прочитай `${CLAUDE_PLUGIN_ROOT}/docs/ai-runtime.md`.

# /review-task

Вход: $ARGUMENTS. Контракт: `tools/ai_review/review_contract.md` проекта.

1. **Пакет ревью:** task.md + `git diff <base>...HEAD` + незакоммиченные и новые файлы +
   `git log <base>..HEAD --oneline` + указатель на `AGENTS.md` и `.claude/rules/*`. Base по умолчанию `main`.
2. **Движок** (один или оба, не доверяя друг другу):
   - Claude: свежий агент `independent-reviewer` — без истории реализации.
   - Codex: `tools/ai_review/codex_review.sh --task <task.md> --base <base>` (см. `/codex-review`).
3. **findings.md** рядом с task.md: заголовок с pass N и движком, findings по схеме, вердикт.
   `REQUEST CHANGES` ⇔ есть CRITICAL/HIGH. Пустой список — валидный результат.

## Важно

- Первый проход — без исправлений. Исправляет автор на шаге FIX.
- Re-review — новый пакет на новом diff, дописывается как pass N+1.
- Finding решён, только когда повторный проход его не репортит.
