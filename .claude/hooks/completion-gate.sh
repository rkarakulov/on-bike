#!/usr/bin/env bash
#
# Completion gate (advisory) — Claude Code `Stop` hook.
#
# Никогда не блокирует (всегда exit 0). Смотрит изменённые и новые TS/TSX-файлы
# в рабочем дереве и напоминает о дешёвых, но частых нарушениях AGENTS.md.
# Молчит, если ничего не нашёл. Работает и в репозитории без коммитов.
# Настоящий gate — `pnpm check` + независимое ревью.
#
set -u

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
  tracked="$(git diff --name-only --diff-filter=d HEAD -- apps packages 2>/dev/null)"
else
  tracked="$(git diff --name-only --cached --diff-filter=d -- apps packages 2>/dev/null)"
fi
untracked="$(git ls-files --others --exclude-standard -- apps packages 2>/dev/null)"

changed="$(printf '%s\n%s\n' "$tracked" "$untracked" \
  | grep -E '\.(ts|tsx)$' | grep -v -E '(^|/)(node_modules|dist|build|\.expo|drizzle)/' | sort -u)"
[ -z "$changed" ] && exit 0

warns=""
src_changed=0
test_changed=0

is_test() {
  case "$1" in
    *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*/__tests__/*|*/test/*|*/e2e/*) return 0 ;;
    *) return 1 ;;
  esac
}

while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue

  if is_test "$f"; then
    test_changed=1
    continue
  fi
  src_changed=1

  if grep -nE '^[^/]*\bconsole\.(log|debug)\(' "$f" >/dev/null 2>&1; then
    warns="${warns}  • console.log в $f → логгер (pino / Logger NestJS)\n"
  fi

  if grep -nE 'catch[[:space:]]*(\([^)]*\))?[[:space:]]*\{[[:space:]]*\}' "$f" >/dev/null 2>&1; then
    warns="${warns}  • пустой catch {} в $f → обработать или пробросить\n"
  fi

  if grep -nE ':[[:space:]]*any\b|\bas[[:space:]]+any\b|<any>' "$f" >/dev/null 2>&1; then
    warns="${warns}  • any в $f → конкретный тип или unknown + сужение\n"
  fi

  case "$f" in
    apps/admin/*.tsx|apps/mobile/*.tsx)
      if grep -nE "[\"'\`>][^\"'\`<]*[А-Яа-яЁё]" "$f" >/dev/null 2>&1; then
        warns="${warns}  • русский текст в $f → вынести в packages/i18n\n"
      fi
      ;;
  esac
done <<EOF
$changed
EOF

if [ "$src_changed" -eq 1 ] && [ "$test_changed" -eq 0 ]; then
  warns="${warns}  • менялся код, но не тесты → новое поведение требует тестов (AGENTS.md §6)\n"
fi

if [ -n "$warns" ]; then
  {
    printf 'Completion gate (advisory):\n'
    printf '%b' "$warns"
    printf '  Перед «готово» — фактический вывод `pnpm check`.\n'
  } >&2
fi

exit 0
