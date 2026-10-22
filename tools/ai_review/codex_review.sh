#!/usr/bin/env bash
#
# codex_review.sh — независимое ревью изменения через Codex CLI (read-only).
#
# Собирает пакет ревью (task.md + diff ветки + незакоммиченные и новые файлы) и запускает
# `codex exec --sandbox read-only`; итог пишет в findings.md по tools/ai_review/review_contract.md.
#
# Usage:
#   tools/ai_review/codex_review.sh --task <docs/tasks/.../task.md> [--base main] [--out <findings.md>]
#
# Exit codes:
#   0  findings записаны (путь печатается в stdout)
#   2  неверные аргументы или нечего ревьюить (пустой diff)
#   3  codex CLI не найден → fallback: агент independent-reviewer
#   4  codex exec упал или ничего не вернул → тот же fallback
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CONTRACT="tools/ai_review/review_contract.md"

TASK_FILE=""
BASE_BRANCH="main"
OUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task) TASK_FILE="${2:-}"; shift 2 ;;
    --base) BASE_BRANCH="${2:-}"; shift 2 ;;
    --out)  OUT_FILE="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$TASK_FILE" || ! -f "$TASK_FILE" ]]; then
  echo "error: --task <path/to/task.md> is required and must exist" >&2
  exit 2
fi
[[ -z "$OUT_FILE" ]] && OUT_FILE="$(dirname "$TASK_FILE")/findings.md"

fallback() {
  cat >&2 <<MSG

[codex_review] Codex-ревью недоступно (${1}).
Fallback (тот же контракт, но НЕ кросс-движковое ревью):
  - запусти свежего агента independent-reviewer с путём к ${TASK_FILE} и base ${BASE_BRANCH};
  - результат допиши в ${OUT_FILE} и отметь «reviewer: claude (fallback)».
Установка Codex: npm i -g @openai/codex && codex login (интерактивно, сам).
MSG
}

if ! command -v codex >/dev/null 2>&1; then
  fallback "codex CLI не найден"
  exit 3
fi

# --- Пакет ревью -------------------------------------------------------------
BRANCH_DIFF=""
COMMITS="(нет диапазона коммитов)"
if git -C "$REPO_ROOT" rev-parse --verify -q "$BASE_BRANCH" >/dev/null 2>&1 \
   && git -C "$REPO_ROOT" rev-parse --verify -q HEAD >/dev/null 2>&1; then
  BRANCH_DIFF="$(git -C "$REPO_ROOT" diff "${BASE_BRANCH}...HEAD" 2>/dev/null || true)"
  COMMITS="$(git -C "$REPO_ROOT" log "${BASE_BRANCH}..HEAD" --oneline 2>/dev/null || true)"
fi

if git -C "$REPO_ROOT" rev-parse --verify -q HEAD >/dev/null 2>&1; then
  WORKTREE_DIFF="$(git -C "$REPO_ROOT" diff HEAD 2>/dev/null || true)"
else
  WORKTREE_DIFF="$(git -C "$REPO_ROOT" diff --cached 2>/dev/null || true)"
fi
UNTRACKED="$(git -C "$REPO_ROOT" ls-files --others --exclude-standard 2>/dev/null || true)"

if [[ -z "$BRANCH_DIFF" && -z "$WORKTREE_DIFF" && -z "$UNTRACKED" ]]; then
  echo "[codex_review] пустой diff относительно ${BASE_BRANCH} и рабочего дерева — ревьюить нечего" >&2
  exit 2
fi

PROMPT="$(cat <<PROMPT_EOF
You are an INDEPENDENT code reviewer for the on-bike monorepo. You did NOT write this change
and must not trust the implementer. Review the task and the diff below, verifying against the repo
(open any file you need: AGENTS.md, .claude/rules/*.md, call sites).

Follow EXACTLY ${CONTRACT}: review dimensions, findings schema, severities, verdict rule.
Write the report in Russian. Output the findings.md content and NOTHING else.
Do not edit any files — findings only.

===== TASK (${TASK_FILE}) =====
$(cat "$TASK_FILE")

===== COMMITS (${BASE_BRANCH}..HEAD) =====
${COMMITS}

===== BRANCH DIFF (${BASE_BRANCH}...HEAD) =====
${BRANCH_DIFF:-(none)}

===== UNCOMMITTED DIFF =====
${WORKTREE_DIFF:-(none)}

===== NEW UNTRACKED FILES (open them in the repo) =====
${UNTRACKED:-(none)}
PROMPT_EOF
)"

echo "[codex_review] codex exec (read-only), base ${BASE_BRANCH} ..." >&2

TMP_OUT="$(mktemp)"
trap 'rm -f "$TMP_OUT"' EXIT

set +e
printf '%s' "$PROMPT" | codex exec \
  --cd "$REPO_ROOT" \
  --sandbox read-only \
  --skip-git-repo-check \
  -o "$TMP_OUT" \
  - >&2
STATUS=$?
set -e

if [[ $STATUS -ne 0 || ! -s "$TMP_OUT" ]]; then
  fallback "codex exec exit ${STATUS} или пустой результат"
  exit 4
fi

# Дописываем проход, а не перезаписываем историю ревью.
mkdir -p "$(dirname "$OUT_FILE")"
{
  [[ -s "$OUT_FILE" ]] && printf '\n\n---\n\n'
  cat "$TMP_OUT"
} >> "$OUT_FILE"

echo "[codex_review] findings: $OUT_FILE" >&2
echo "$OUT_FILE"
