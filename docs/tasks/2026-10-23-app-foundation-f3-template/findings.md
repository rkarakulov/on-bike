# Findings — F3 (шаблон copier)

Diff: app-foundation `main...feature/f3-template` (5246077..3631945).

## Claude independent-reviewer — pass 1 — REQUEST CHANGES

| # | Severity | Находка | Статус |
|---|---|---|---|
| 1 | HIGH | `template-release`: токен `contents: write` доступен стороннему коду при `template:check` (один job) | fixed (3220a21) |
| 2 | MEDIUM | `_skip_if_exists: README.md` замораживает все README на любой глубине; `template-update` маскирует по basename | fixed (a38f69b) |
| 3 | MEDIUM | Админка выводит статус API без i18n | fixed (a38f69b) |
| 4–11 | LOW | `MAIL_FROM` с `#`; неиспользуемый `author`; AGENTS.md §2 про hooks api-client; комментарий о проверке тега; `template:check` идёт на чужие порты; правило о миграциях шаблона; `.DS_Store` в `sync-template-version`; `_commit` с тегом пакета | fixed (3220a21, a38f69b) |

Проверено ревьюером: рендеры (по умолчанию, PostGIS, «злое» имя проекта) проходят `pnpm check`; `template:check` 1–7 зелёный;
StrictUndefined, экранирование, deny-лист = on-bike, доменный grep пуст, копий кода базы нет, gitleaks чист.

## CI на GitHub (PR #3, 3631945)

`secrets` (gitleaks на PR без `pull-requests: read` — 403) и `plugin` (Node 24.21 по `.nvmrc` «24» против devEngines
`^24.22`) — исправлено 957f95c. `template (false/true)`, `check`, `template-update` — зелёные.

## Claude independent-reviewer — pass 2 — APPROVE

Все 11 находок pass 1 закрыты, новых нет. `template:check` (PostGIS) — 8/8 шагов зелёные: API 13, app 22, admin 7,
design-tokens 61; негативные пути проверки PG/Redis; `.env.example` с «злыми» именами разбирается без потерь.
NOT VERIFIED: release на GitHub (`template-release-check` → `template-tag`), `template-update` до первого тега `v*`.
