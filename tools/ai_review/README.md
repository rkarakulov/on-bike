# tools/ai_review

| Файл | Назначение |
|---|---|
| `review_contract.md` | вход, измерения, схема находок и вердикт — общие для Claude и Codex |
| `codex_review.sh` | ревью изменения через `codex exec --sandbox read-only` → `findings.md` |
| `codex_arch_review.sh` | кросс-ревью архитектурного аудита → `review.md` |

Коды выхода: 0 — готово, 2 — аргументы / пустой diff, 3 — нет Codex CLI, 4 — сбой codex exec.
При 3 и 4 — fallback на свежего агента (`independent-reviewer` или `architect`).
Вызов из команд: `/codex-review`, `/review-task`, `/architecture-review`.
