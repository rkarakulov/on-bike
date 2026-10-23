# Findings — F5a (web/PWA/SSR в базе)

Diff: app-foundation `origin/main...feature/f5a-web` (ff1a294..d804eba), PR rkarakulov/app-foundation#5.

## Claude independent-reviewer — pass 1 — REQUEST CHANGES

| Severity | Находка | Статус |
|---|---|---|
| HIGH | `<Head>` (`expo-router/head`) на `/status` на iOS (dev client/EAS) без `origin` — throw/alert на каждом рендере; правило `app.md` тиражирует | в работе: `DocumentTitle` развилкой `.web`/native, правило «head только в `.web`» |
| MEDIUM | Локальный `pnpm e2e:web` с живым API падает на CORS (e2e-порты не в `CORS_ORIGINS`) | в работе |
| MEDIUM | Версия кеша SW — от имён, нехешированные `/assets/*` устаревают навсегда | в работе: версия от содержимого, precache только хешированного |
| LOW | Maskable-иконка = копия 512 (нет safe zone) | в работе |
| LOW | `Chip` на web: `aria-selected` на `button` не озвучивается | в работе: `aria-pressed` на web |
| LOW | Precache тянет весь `/assets` (~3–4 МБ) | в работе (с MEDIUM SW) |

Проверено ревьюером: `template:check --e2e` 12 шагов, Playwright 5/5; секреты не попадают в HTML/клиентский бандл
(`API_INTERNAL_URL`, `WEB_ORIGIN` — только сервер), `og:url` только из `WEB_ORIGIN`; заголовки безопасности; SW не
кеширует HTML/`/v1`/loaders; эмуляция ui 0.2.0 tarball-ом — тёмная тема после гидрации, `input[type=date]`, `aria-*` в DOM;
CI PR #5 зелёный.
