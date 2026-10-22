# Артефакты задач

```
docs/tasks/<YYYY-MM-DD>-<slug>/
  task.md      спецификация и план (шаблон .claude/task-template.md)
  findings.md  проходы независимого ревью (tools/ai_review/review_contract.md)
  pr.md        описание PR
```

- Создаются командами `/create-spec`, `/task2`, `/task3`, `/review-task`, `/finish-task`.
- Коммитятся вместе с кодом задачи — это история решений для людей и агентов.
- `/task1` и fast path артефактов не требуют.
- Продолжить задачу: `/develop-task docs/tasks/<…>/task.md`.
