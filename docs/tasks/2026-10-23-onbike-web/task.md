# F5b: on-bike в браузере — copier update до `v0.2.0`, web-сессия, без Astro-лендинга

## 1. Title
Приложение on-bike работает в браузере (web/PWA, SSR публичных экранов) как то же приложение; Astro-лендинг удалён.

## 2. Goal
ADR-0003 (раздел «Решение», п. 0–6) и задача-основа `docs/tasks/2026-10-22-universal-app-foundation/task.md`: веб — то же
приложение, не лендинг. Каркас web/PWA/SSR приходит из шаблона app-foundation `v0.2.0` (F5a), продуктовая часть — здесь.
Решение человека 2026-10-23: делать автономно.

## 3. Scope
- **`copier update` с `v0.1.2` до `v0.2.0`** — первое настоящее обновление шаблона: слияние, разбор конфликтов, сохранение
  локальных отличий on-bike (перечень F3b §12 обновить), пакеты `@rkarakulov/*` 0.2.0.
- **Web on-bike:** все существующие маршруты (вкладки, `/ui-kit` в dev, регистрация, «Подтвердите e-mail»,
  `/auth/verify/<token>`) работают в браузере с той же дизайн-системой; платформенные развилки — файлами `.web`
  (`features/auth/secure-storage.web.ts` и др.); NetInfo/expo-модули — проверка web-поддержки.
- **Сессия в вебе (API identity on-bike):** web-клиент получает refresh в httpOnly `Secure` `SameSite=Strict` cookie
  (`/v1/auth`), тело ответа — без refresh; access — в памяти; CSRF-защита cookie-эндпоинтов; контракты — вариант ответа
  для web; native — как сейчас (SecureStore). Ссылки из писем для web — https-маршруты приложения (`APP_LINK_BASE` web).
- **PWA и SSR on-bike:** manifest/цвета бренда (Jersey Aura / Night Ride), иконки on-bike, `/status` из шаблона — оставить
  или заменить публичным экраном on-bike (решает architect); OG для гостевых ссылок — заготовка.
- **Удаление `apps/landing`** (Astro): пакет, workspace, CI, compose/Caddy (если есть), docs, правила (`onbike-web.md` —
  только admin), AGENTS.md §2, README, ADR-0001 (пометка «частично заменён ADR-0003»), локальные отличия «до F5» в корне
  (prettier-plugin-astro, ignore, depcruise, eslint) — убрать, выровнять с шаблоном.
- **Проверки:** `pnpm check`, web export + SSR + Playwright-смоук on-bike (Главная, регистрация до «Подтвердите e-mail»,
  страница подтверждения по ссылке, `/ui-kit` dev), Android export, ручной смоук в браузере (человек).

## 4. Out of Scope
- Universal links/app links (нужен домен), карты на web, шеринг, офлайн-данные; слайсы онбординга 2+ (вход, сброс пароля)
  — после F5b, они уже будут web-first.

## 5–8
Заполняет architect (§8.1); риски: конфликты copier update, cookie-сессия (безопасность), удаление лендинга.

## 8.2 Deviations from spec

## 8.3 Security checklist
Затронуты сессии и аутентификация (web cookie, CSRF), публичные страницы. Чек-лист — `.claude/rules/security.md` (обязателен).

## 9. Acceptance Criteria
1. `.copier-answers.yml` — `_commit: v0.2.0`; конфликты разобраны, локальные отличия перечислены.
2. Все маршруты on-bike работают в браузере; регистрация → письмо → подтверждение → вход в браузере (Playwright + человек).
3. Web: refresh только в httpOnly cookie, access в памяти, CSRF; native — без изменений (тесты).
4. PWA устанавливается, цвета бренда; SSR отдаёт HTML; `apps/landing` удалён без потери функций.
5. `pnpm check`, web/Android export, Playwright — зелёные; CI зелёный.

## 10. Documentation Impact
AGENTS.md, rules, runbook (web, cookie), architecture, ADR-0001/0003, design.md (F5 сделан).

## 11. Implementation Context
Заполняет architect.

## 12. Outcome
Заполняет coder.
