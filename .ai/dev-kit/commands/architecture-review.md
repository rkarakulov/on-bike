---
description: Периодический read-only аудит архитектуры проекта → .architecture/ (debt register со стабильными ARCH-ID, задачи для /develop-task). Запускать, когда кодовая база вырастет (ориентир — несколько эпиков в коде).
argument-hint: [full | incremental | status]
---

> **Runtime:** сначала прочитай `${CLAUDE_PLUGIN_ROOT}/docs/ai-runtime.md`.

# /architecture-review

> ⚠️ Запускать, когда кодовая база вырастет. На пустом скелете аудит бесполезен.

Режим: $ARGUMENTS (по умолчанию `incremental`, если есть `.architecture/LAST`, иначе `full`).
Шаблон состояния — `${CLAUDE_PLUGIN_ROOT}/templates/architecture-review-template.md`. Код не меняется.

## Фазы

1. **Tech profile** — версии ключевых библиотек (включая пакеты базы `@rkarakulov/*`); лучшие практики
   сверить через context7.
2. **Карта архитектуры** — приложения, пакеты, модули API, зависимости (`pnpm arch:check`, если есть; граф turbo).
3. **Проверка инвариантов** `AGENTS.md` §4 проекта: серверный авторитет, append-only, contracts-first,
   границы модулей, очереди и идемпотентность, миграции, секреты, дизайн-система, состояния данных, платформы.
4. **Findings** — каждое с evidence (путь:строка, вывод команды), severity, влиянием.
5. **Self-challenge** — опровергни свои находки; оставь только защищаемые.
6. **Кросс-ревью** — `tools/ai_review/codex_arch_review.sh --audit .architecture/current/audit.md`;
   при коде 3/4 — свежий агент `architect`. Несогласия помечай `DISPUTED`.
7. **Вопросы человеку** — что нельзя решить из кода (human gate).
8. **DO NOT TOUCH** — что выглядит странно, но менять нельзя, и почему.
9. **Debt register** — `.architecture/debt-register.md`: стабильные `ARCH-XXX`, статус
   NEW / UNCHANGED / REGRESSED / RESOLVED, severity, evidence.
10. **Приоритеты** — now / next / later; для now — черновики task.md под `/develop-task`.

Находка в общем коде базы (пакеты `@rkarakulov/*`) — не правится в проекте: черновик задачи для
репозитория app-foundation.

В режиме `incremental` — только изменения с `.architecture/LAST`; `status` — сводка реестра без аудита.

## Итог

Путь к аудиту, число находок по severity, изменения реестра, предложенные задачи, вопросы человеку.
