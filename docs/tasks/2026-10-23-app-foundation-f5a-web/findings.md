# Findings — F5a (web/PWA/SSR в базе)

Diff: app-foundation `origin/main...feature/f5a-web` (ff1a294..d804eba), PR rkarakulov/app-foundation#5.

## Claude independent-reviewer — pass 1 — REQUEST CHANGES

| Severity | Находка | Статус |
|---|---|---|
| HIGH | `<Head>` (`expo-router/head`) на `/status` на iOS (dev client/EAS) без `origin` — throw/alert на каждом рендере; правило `app.md` тиражирует | fixed (62a0fad) |
| MEDIUM | Локальный `pnpm e2e:web` с живым API падает на CORS (e2e-порты не в `CORS_ORIGINS`) | fixed (d00b8a8) |
| MEDIUM | Версия кеша SW — от имён, нехешированные `/assets/*` устаревают навсегда | fixed (960d8a7) |
| LOW | Maskable-иконка = копия 512 (нет safe zone) | fixed (73179d4) |
| LOW | `Chip` на web: `aria-selected` на `button` не озвучивается | fixed (a287f6b) |
| LOW | Precache тянет весь `/assets` (~3–4 МБ) | частично (960d8a7); остаток — LOW follow-up |

Проверено ревьюером: `template:check --e2e` 12 шагов, Playwright 5/5; секреты не попадают в HTML/клиентский бандл
(`API_INTERNAL_URL`, `WEB_ORIGIN` — только сервер), `og:url` только из `WEB_ORIGIN`; заголовки безопасности; SW не
кеширует HTML/`/v1`/loaders; эмуляция ui 0.2.0 tarball-ом — тёмная тема после гидрации, `input[type=date]`, `aria-*` в DOM;
CI PR #5 зелёный.

## Claude independent-reviewer — pass 2 — APPROVE

Все находки pass 1 закрыты; сторож `ExpoHead` проверен экспериментом (прямой `<Head>` → 4 failed). Новых CRITICAL/HIGH/MEDIUM
нет. LOW follow-up: картинка витрины `ui-kit` (~780 КБ) и её чанк попадают в production precache (варианты: кешировать
`/assets/**` при первом запросе, исключить ассеты dev-маршрутов, уменьшить картинку).
NOT VERIFIED: iOS dev client/EAS на устройстве (подтверждено моком и кодом expo-router).
