# Findings — F3b (on-bike принимает шаблон v0.1.2)

## Codex — pass 1 — APPROVE (`findings-codex.md`)

| Severity | Находка | Статус |
|---|---|---|
| MEDIUM | `onbike-web.md` направляет лендинг в `web-ui`, который исключает гостевой веб; потеряны требования i18n и доступности лендинга | fixed: временное применение UI-плана к Astro до F5, восстановлены i18n, состояния и доступность |

## Claude (независимый агент, контракт `review_contract.md`) — pass 1 — APPROVE

| Severity | Находка | Статус |
|---|---|---|
| MEDIUM | Правка identity/media/account больше не подгружает `security.md` (пути перенесены в `onbike-security.md`, а чек-лист и правила identity — нет) | fixed: «прочитай `security.md`», чек-лист и правила identity в `onbike-security.md`; follow-up — пути identity в `security.md` шаблона (F6) |
| LOW | Лендинг потерял общие web-правила (i18n, §4.12, a11y) | fixed (вместе с находкой Codex) |
| LOW | `docs/tasks/README.md` ссылается на удалённый шаблон и команды без префикса | fixed |
| LOW | Runbook перехода тома: migrate мог уйти в старую базу | fixed: явный `DATABASE_URL` в команде |
| LOW | Выпало «RabbitMQ не используем» | fixed: `onbike-backend.md` «Очереди» |

Проверено ревьюером: бренд и тексты без изменений (кроме статуса API в админке), переименование `apps/mobile` полное с
историей, deny/allow/ask совпадают, SHA actions сверены, домен процесса перенесён в `onbike-*.md`, `.copier-answers.yml`
и перечень §12 полны, `pnpm check`, build, `db:generate` — зелёные.
NOT VERIFIED ревьюером: copier update на тестовый тег, expo export, старт API (проверены автором — §12).
