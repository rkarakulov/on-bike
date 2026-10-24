# Бренд: «Покатим»

Решение автора 2026-10-24: отображаемое название продукта — **«Покатим»** (кириллицей). Внутреннее имя проекта —
**pokatim** (латиницей; до 2026-10-25 — on-bike, переименование — `docs/tasks/2026-10-25-rename-pokatim/task.md`).

## Где бренд

Всё, что видит пользователь, берёт название из одного места — `app.name` в `packages/i18n/src/ru.ts`
(`t('app.name')`): заголовки страниц и OG (`— Покатим`, `og:site_name`), manifest PWA (`name`, `short_name`).
Вне i18n (константы платформ и тексты вне приложения):

- `apps/app/app.json` — `expo.name` (название под иконкой в iOS/Android);
- `apps/admin/index.html` — `<title>` панели организатора;
- `apps/api/src/modules/identity/mail/*` — тексты писем («регистрацию в «Покатим»»);
- `MAIL_FROM` — отображаемое имя отправителя (`apps/api/.env.example`, `infra/deploy/env.template`,
  `infra/.env.example`, таблица окружения в `docs/runbooks/local-dev.md`; на серверах — их `.env`: dev-стенд
  заменяет прежние умолчания (`on-bike dev`, `@on-bike.by`) сам, `infra/deploy/bootstrap.sh` → `migrate_mail_from`, ручное
  значение не трогает).

## Внутреннее имя pokatim (смена бренда его не трогает)

Scope пакетов `@pokatim/*`, образы GHCR `pokatim-*`, compose project, БД, bundle id `by.pokatim.app` и схема
`pokatim://`, `expo.slug`, имя cookie `__Secure-pokatim_rt`, ключи хранилищ `pokatim.*`, issuer/audience JWT,
пути и имена файлов, документы. Репозиторий GitHub — `rkarakulov/pokatim` (до 2026-10-25 — `rkarakulov/on-bike`, переадресация работает).

Смена бренда — правка мест выше и тестов, которые сверяют тексты (`public-metadata.test.ts`, `e2e/web.spec.ts`,
`verification-email.test.ts`, `password-reset-email.test.ts`, `password-changed-email.test.ts`,
`packages/i18n/src/index.test.ts`).
