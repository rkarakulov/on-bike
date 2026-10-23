# Артефакты задач

```
docs/tasks/<YYYY-MM-DD>-<slug>/
  task.md      спецификация и план (шаблон — плагин app-dev-kit: .ai/dev-kit/templates/task-template.md)
  findings.md  проходы независимого ревью (tools/ai_review/review_contract.md)
  pr.md        описание PR
```

- Создаются командами плагина `/app-dev-kit:create-spec`, `/app-dev-kit:task2`, `/app-dev-kit:task3`,
  `/app-dev-kit:review-task`, `/app-dev-kit:finish-task` (Codex — скилы `.agents/skills`).
- Коммитятся вместе с кодом задачи — это история решений для людей и агентов.
- `/app-dev-kit:task1` и fast path артефактов не требуют.
- Продолжить задачу: `/app-dev-kit:develop-task docs/tasks/<…>/task.md`.
