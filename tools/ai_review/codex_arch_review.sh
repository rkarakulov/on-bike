#!/usr/bin/env bash
#
# codex_arch_review.sh — независимое кросс-ревью архитектурного аудита через Codex CLI (read-only).
#
# Для /architecture-review: даёт Codex готовый audit.md (+ опционально arch-map.md), просит
# опровергнуть находки, найти false positives и пропущенное. Аудит не переписывает.
#
# Usage:
#   tools/ai_review/codex_arch_review.sh --audit .architecture/current/audit.md \
#     [--context .architecture/current/arch-map.md] [--out .architecture/current/review.md]
#
# Exit codes:
#   0  ревью записано (путь печатается в stdout)
#   2  неверные аргументы
#   3  codex CLI не найден → fallback: свежий агент architect
#   4  codex exec упал или ничего не вернул → тот же fallback
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

AUDIT_FILE=""
CONTEXT_FILE=""
OUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --audit)   AUDIT_FILE="${2:-}"; shift 2 ;;
    --context) CONTEXT_FILE="${2:-}"; shift 2 ;;
    --out)     OUT_FILE="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$AUDIT_FILE" || ! -f "$AUDIT_FILE" ]]; then
  echo "error: --audit <path/audit.md> is required and must exist" >&2
  exit 2
fi
if [[ -n "$CONTEXT_FILE" && ! -f "$CONTEXT_FILE" ]]; then
  echo "error: context file not found: $CONTEXT_FILE" >&2
  exit 2
fi
[[ -z "$OUT_FILE" ]] && OUT_FILE="$(dirname "$AUDIT_FILE")/review.md"

fallback() {
  cat >&2 <<MSG

[codex_arch_review] Codex-ревью аудита недоступно (${1}).
Fallback (НЕ кросс-движковое): свежий агент architect, который видит аудит впервые:
  «Попробуй опровергнуть находки ${AUDIT_FILE}, найди false positives и пропущенные проблемы,
   сверяясь с кодом. Верни только findings (severity + почему), аудит не переписывай.»
Сохрани результат в ${OUT_FILE} и пометь раунд как architect-fallback.
MSG
}

if ! command -v codex >/dev/null 2>&1; then
  fallback "codex CLI не найден"
  exit 3
fi

CONTEXT_BLOCK=""
if [[ -n "$CONTEXT_FILE" ]]; then
  CONTEXT_BLOCK="$(printf '\n===== ARCHITECTURE MAP (%s) =====\n%s' "$CONTEXT_FILE" "$(cat "$CONTEXT_FILE")")"
fi

PROMPT="$(cat <<PROMPT_EOF
You are an INDEPENDENT architecture reviewer for this monorepo (AGENTS.md §1), seeing this audit for the
FIRST time. Do NOT trust that it is correct. Working from the audit and the repository itself:
  - try to REFUTE findings and challenge generic recommendations,
  - find FALSE POSITIVES,
  - find architectural problems the audit MISSED,
  - offer alternative interpretations where the conclusion is debatable.

Judge against the project canon: AGENTS.md (invariants §4: server authority, contracts-first,
module boundaries via index.ts, idempotent BullMQ jobs and outbox, migrations not on startup,
no secrets, append-only audit where the project keeps one) and .claude/rules/*.md.

Output ONLY findings in Russian: severity (CRITICAL/HIGH/MEDIUM/LOW), which audit finding it
concerns (ARCH-XXX or MISSED), and WHY with evidence (path:line). End with a verdict
SOUND | NEEDS-WORK and counts of confirmed CRITICAL/HIGH, DISPUTED, MISSED.
Do NOT rewrite the audit. Do NOT edit any files.

===== ARCHITECTURE AUDIT (${AUDIT_FILE}) =====
$(cat "$AUDIT_FILE")${CONTEXT_BLOCK}
PROMPT_EOF
)"

echo "[codex_arch_review] codex exec (read-only) over ${AUDIT_FILE} ..." >&2

set +e
printf '%s' "$PROMPT" | codex exec \
  --cd "$REPO_ROOT" \
  --sandbox read-only \
  --skip-git-repo-check \
  -o "$OUT_FILE" \
  - >&2
STATUS=$?
set -e

if [[ $STATUS -ne 0 || ! -s "$OUT_FILE" ]]; then
  fallback "codex exec exit ${STATUS} или пустой результат"
  exit 4
fi

echo "[codex_arch_review] review: $OUT_FILE" >&2
echo "$OUT_FILE"
