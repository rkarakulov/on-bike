# F5a: web, PWA и SSR универсального приложения в базе app-foundation

## 1. Title
Шаблон и `@rkarakulov/ui`: одно Expo-приложение — iOS, Android и браузер (web/PWA, SSR публичных экранов).

## 2. Goal
Проект из шаблона сразу работает в браузере как то же приложение (мобильный и десктопный браузер, установка как PWA),
публичные экраны рендерятся на сервере с OG-мета, компоненты дизайн-системы имеют web-варианты. Основа — ADR-0003 on-bike
и задача-основа `docs/tasks/2026-10-22-universal-app-foundation/task.md` (общая часть уходит в базу; продуктовая — F5b).
Решение человека 2026-10-23: делать автономно, сначала база, затем on-bike.

## 3. Scope
- **`@rkarakulov/ui`:** web-варианты платформенных компонентов файлами рядом (`date-field.web.tsx` — `<input
  type="date">` в стиле поля системы; остальные компоненты — проверка рендера в react-native-web), тесты web-вариантов,
  витрина `UiKit` работает в браузере; проверка зависимостей на web (datetimepicker, AccessibilityInfo, Animated).
- **Шаблон `apps/app`:** `web.output: 'server'`, `react-native-web`, `react-dom`, `@expo/metro-runtime`, адаптер
  `expo-server` (Node) — скрипты `build:web`/`start:web`; `+html.tsx` (корневой HTML, тема и цвета из токенов,
  `theme-color` light/dark, viewport); PWA — manifest (имя, цвета, иконки), service worker только со статикой (без
  офлайн-данных), установка «На экран Домой»; пример публичного экрана с `loader` + `<Head>` (OG-мета) — тот же экран,
  что в приложении; вкладки и витрина работают в браузере.
- **Платформенные развилки — только файлами `.web.ts(x)`/`.native.ts(x)` рядом** (правило в шаблоне: AGENTS.md
  §4.13, rules `app.md`, скил `mobile-expo` в плагине); экраны о платформе не знают.
- **Тесты и проверки:** jest web-проект (`jest-expo` universal/web preset) для компонентов с web-вариантами;
  `template:check` — `expo export --platform web` + запуск SSR-сервера и `curl` публичного экрана (OG в HTML) +
  manifest/service worker в выдаче; CI базы — то же; Playwright-смоук (Главная, `/ui-kit`, публичный экран) — в
  шаблоне как `pnpm e2e:web` и в CI шаблона/проекта.
- **Процесс:** «фича = все платформы»: контракт ревью шаблона (нет web-варианта экрана — HIGH), скил `mobile-expo`
  плагина — проверка экрана в браузере в VERIFY.
- **Релиз:** changeset minor (`0.2.0`), тег шаблона `v0.2.0`.

## 4. Out of Scope
- Сессия в вебе (refresh в httpOnly cookie, CSRF) — это identity: в on-bike — F5b, в базе — F6.
- Universal links/app links (нужен домен), карты на web, шеринг, офлайн-данные.
- Удаление Astro-лендинга on-bike — F5b.

## 5. Architecture Context
Expo SDK 58 / Expo Router: `web.output: 'server'` — HTML на каждый запрос, `loader` маршрута для серверных данных,
`expo-router/head` для мета, адаптеры `expo-server`. Сверить актуальные API по документации Expo (не по памяти).

## 5.1 Placement & Reuse Gate
- Web-варианты компонентов — в `@rkarakulov/ui` (не в проекте); каркас web/PWA/SSR — в шаблоне.
- Платформенные развилки только файлами рядом; без `Platform.OS` в экранах.

## 6. Relevant Files
app-foundation: `packages/ui/src/**`, `template/apps/app/**`, `template/AGENTS.md.jinja`, `template/.claude/rules/app.md*`,
`plugin/skills/mobile-expo/SKILL.md`, `template/tools/ai_review/review_contract.md`, `scripts/check-template.mjs`,
`.github/workflows/ci.yml`, `template/.github/workflows/ci.yml.jinja`, README.

## 7. Implementation Notes
- Токены цветов для manifest/`theme-color` — из `design-tokens` проекта (бренд), без hex в коде приложения.
- Service worker: только кеш статики сборки; версия кеша — от сборки; регистрация только в production web.

## 8. Risks / Assumptions / Open Questions
- SSR + react-native-web + `@rkarakulov/ui` (ESM) — проверить, что серверный бандл резолвит пакеты базы.
- Playwright в CI — вес установки браузеров; держать смоук минимальным.

## 8.1 Requirements Consistency
Заполняет architect.

## 8.2 Deviations from spec

## 8.3 Security checklist
Затронуты публичные страницы (OG-мета) и внешний HTTP-сервер web. Данные наружу — только публичные поля объекта;
заголовки безопасности SSR-сервера (CSP минимальный, `X-Content-Type-Options`, `Referrer-Policy`); service worker не
кеширует ответы API. AuthN/AuthZ — не затронуты (F5b/F6).

## 9. Acceptance Criteria
1. Проект из шаблона: вкладки, витрина `/ui-kit` (dev) и публичный экран работают в браузере (expo export web + SSR-сервер).
2. `curl` публичного экрана возвращает HTML с OG-мета с сервера.
3. Manifest и service worker отдаются; PWA устанавливается (проверка в Chromium: installable, Playwright/Lighthouse-критерии).
4. `DateField` на web — нативный `<input type="date">` в стиле системы, тесты web-варианта зелёные.
5. `pnpm check`, `template:check` (оба варианта `use_postgis`), smoke, plugin validate — зелёные; CI зелёный.
6. Правило «фича = все платформы» — в AGENTS.md шаблона, rules, скиле плагина и контракте ревью.

## 10. Documentation Impact
README базы, AGENTS.md базы и шаблона, runbook шаблона (web-сборка, PWA), design.md (F5a).

## 11. Implementation Context
Заполняет architect.

## 12. Outcome
Заполняет coder.
