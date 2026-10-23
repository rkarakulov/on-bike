# 1. Title

Универсальное приложение — основа: web/PWA + SSR из одного Expo-проекта, удаление Astro-лендинга

Статус: **сделано — F5a + F5b** (2026-10-23). Решение — ADR-0003. Каркас web/PWA/SSR — шаблон app-foundation
`v0.2.0` (F5a); on-bike — `copier update` до `v0.2.0`, web-сессия (cookie + CSRF), PWA бренда, e2e регистрации,
удаление `apps/landing` (F5b, `docs/tasks/2026-10-23-onbike-web/task.md`). Отличия от плана ниже: приложение —
`apps/app` (не `apps/mobile`), OG — `generateMetadata` (не `<Head>`), `DateField` web — в `@rkarakulov/ui`.

# 2. Goal

Приложение райдера (`apps/mobile`) работает в браузере как **то же приложение, а не лендинг** — с тем же
функционалом, что в iOS и Android (мобильный и десктопный браузер, установка как PWA); публичные экраны
объектов рендерятся на сервере с OG-мета; Astro-лендинг больше не нужен. Дальше каждая фича делается сразу
для всех платформ (AGENTS.md §4.13). Всё до слайса 2
онбординга, потому что сессия в вебе меняет API входа.

# 3. Scope

- **Web-сборка:** `web.output: 'server'`, `react-native-web`, `react-dom`, `@expo/metro-runtime`; `expo-server`
  адаптер (Node) для прод; Caddy проксирует гостевой веб вместо landing.
- **PWA:** manifest (имя, цвета из `design-tokens`, иконки), service worker со статикой (без офлайн-данных),
  `theme-color` light/dark, установка «На экран Домой».
- **Платформенные развилки** (только файлами рядом):
  - `components/ui/date-field.web.tsx` — `<input type="date">` в стиле поля дизайн-системы;
  - `features/auth/secure-storage.web.ts` — без хранения refresh (cookie), access — в памяти;
  - проверка web-поддержки остальных зависимостей (NetInfo, expo-location, expo-document-picker, expo-image).
- **Сессия в вебе (API):** web-клиент получает refresh в httpOnly `Secure` `SameSite=Strict` cookie
  (`/v1/auth`), тело ответа — без refresh; CSRF-защита для cookie-эндпоинтов; контракты — вариант ответа.
- **Публичные экраны приложения** (вместо лендинга): заготовка экрана объекта с `loader` + `<Head>` (OG) —
  тот же экран, что гость видит в приложении; ссылки из писем — https-маршруты приложения (`APP_LINK_BASE` для web).
- **Процесс:** правило «фича = все платформы» в `.claude/rules/mobile.md`, скиле `mobile-expo` и контракте ревью
  (нет web-варианта экрана — HIGH); проверка экрана в браузере — часть VERIFY каждой задачи.
- **Удаление `apps/landing`:** пакет, workspace, Caddy, compose, docs, правила (`.claude/rules/web.md` →
  только admin), AGENTS.md §2, README, ADR-0001 — пометка «частично заменён ADR-0003».
- **Тесты и CI:** jest-проект web (`jest-expo` web/universal preset) для компонентов дизайн-системы;
  `expo export --platform web` в CI; Playwright smoke: Главная, витрина `/ui-kit`, гостевая страница с OG.
- **Замеры:** вес JS гостевой страницы и время первого рендера — в pr.md.

# 3.1 Acceptance (черновик)

1. **Открывается везде:** все существующие маршруты (вкладки, `/ui-kit` в dev, регистрация, «Подтвердите
   e-mail», ссылка подтверждения `/auth/verify/<token>`) работают в мобильном Safari/Chrome и десктопном
   браузере без установки приложения, с тем же поведением и дизайн-системой.
2. Ссылка из письма в dev web открывает веб-версию; в нативной сборке — приложение (когда будет домен).
3. PWA устанавливается («На экран Домой»), открывается без адресной строки, цвета — из токенов.
4. Гостевая страница объекта отдаёт HTML с OG-мета с сервера (проверка `curl`).
5. `apps/landing` удалён без потери функций; `pnpm check` и web-сборка в CI зелёные.

# 4. Out of Scope

- Universal links / app links (нужен домен), карты (MapLibre web — с экраном маршрута), шеринг (с карточками).
- Офлайн-режим данных.

# 5–12

Заполняются при старте задачи через `/develop-task` (UNDERSTAND → SPEC → architect).
