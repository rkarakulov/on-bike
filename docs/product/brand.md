# Бренд: «Покатим»

Решение автора 2026-10-24: отображаемое название продукта — **«Покатим»** (кириллицей). Внутреннее имя проекта
остаётся **on-bike**.

## Где бренд

Всё, что видит пользователь, берёт название из одного места — `app.name` в `packages/i18n/src/ru.ts`
(`t('app.name')`): заголовки страниц и OG (`— Покатим`, `og:site_name`), manifest PWA (`name`, `short_name`).
Вне i18n (константы платформ и тексты вне приложения):

- `apps/app/app.json` — `expo.name` (название под иконкой в iOS/Android);
- `apps/admin/index.html` — `<title>` панели организатора;
- `apps/api/src/modules/identity/mail/*` — тексты писем («регистрацию в «Покатим»»);
- `MAIL_FROM` — отображаемое имя отправителя (`apps/api/.env.example`, `infra/deploy/env.template`,
  `infra/.env.example`, таблица окружения в `docs/runbooks/local-dev.md`; на серверах — их `.env`: dev-стенд
  заменяет прежнее умолчание `on-bike dev` сам, `infra/deploy/bootstrap.sh` → `migrate_mail_from`, ручное
  значение не трогает).

## Что не меняется (внутреннее имя on-bike)

Scope пакетов `@on-bike/*`, репозиторий, образы GHCR, compose project, БД, bundle id `by.onbike.app` и схема
`onbike://`, `expo.slug`, имя cookie `__Secure-onbike_rt`, ключи хранилищ `onbike.*`, issuer/audience JWT, домен,
пути и имена файлов, документы.

Смена бренда — правка мест выше и тестов, которые сверяют тексты (`public-metadata.test.ts`, `e2e/web.spec.ts`,
`verification-email.test.ts`, `password-reset-email.test.ts`, `password-changed-email.test.ts`,
`packages/i18n/src/index.test.ts`).
