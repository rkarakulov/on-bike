# Шаблон состояния `/architecture-review`

```
.architecture/
  README.md            что это и как запускать
  LAST                 дата и commit последнего аудита
  debt-register.md     реестр долга (коммитится)
  current/             текущий аудит
    tech-profile.md
    arch-map.md
    audit.md
    review.md          кросс-ревью (Codex или architect)
    questions.md       вопросы человеку и ответы
    do-not-touch.md
    tasks/ARCH-XXX.md  черновики task.md
  history/<YYYY-MM-DD>/ предыдущие аудиты
```

## audit.md — формат находки

```md
### ARCH-XXX [CRITICAL|HIGH|MEDIUM|LOW] <заголовок>
- **area:** api/<module> | admin | landing | mobile | packages/<pkg> | infra
- **invariant:** AGENTS.md §4.N или правило из .claude/rules/*
- **evidence:** path:line, вывод команды
- **impact:** что сломается / чего стоит
- **recommendation:** конкретно, в рамках одного task.md
- **status:** NEW | UNCHANGED | REGRESSED | RESOLVED | DISPUTED
```

## debt-register.md

| ID | Severity | Area | Заголовок | Статус | Впервые | Последний аудит | Задача |
|---|---|---|---|---|---|---|---|

ID стабильны между аудитами: новая находка получает следующий номер, решённая остаётся со статусом RESOLVED.

## Приоритеты

- **now** — CRITICAL/HIGH, нарушение инварианта; черновик task.md обязателен.
- **next** — MEDIUM с растущей стоимостью.
- **later** — LOW, косметика.
