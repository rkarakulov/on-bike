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
Architecture Review — app-foundation-f5a-web. **Status: CONCERNS** (блокеров нет: решения R1–R9 ниже приняты
architect-ом по умолчанию; R5 и R8 — расширение scope, оркестратор может отклонить). Проверено прототипом
(рендер шаблона `v0.1.2`, Expo SDK 58.0.17 / expo-router 58.0.25 / expo-server 58.0.5, `expo export -p web`, SSR-сервер,
`curl`, Playwright 1.64.1 на системном Chrome) и документацией docs.expo.dev (router/web/{server-rendering,
data-loaders,middleware}, guides/progressive-web-apps).

Найдено прототипом (факты, не гипотезы):
- **F1. Платформенный файл в `@rkarakulov/ui` не подхватится.** Исходники ui импортируют с расширением
  (`'./date-field.tsx'` → в `dist` `'./date-field.js'`), Metro и jest сначала берут точный путь — `date-field.web.js`
  рядом игнорируется (проверено: маркер web-варианта не попал в бандл). Без расширения (`'./date-field'`) — работает в
  клиентском и серверном бандле Metro и в jest web-пресете (проверено на `dist`). tsconfig пакета — `moduleResolution:
  Bundler`, ui в Node ESM не импортируется (`smoke/import.mjs`), так что безрасширенный импорт допустим.
- **F2. SSR-бандл не видит исходники workspace-пакетов проекта.** Для `environment=node` Expo CLI перезаписывает
  `unstable_conditionNames = ['node']` (`@expo/cli …/withMetroMultiPlatform.js`), условие `@<scope>/source` из
  `metro.config.js` теряется → `Unable to resolve "@my-app/i18n"` (нет `dist`). Чинится `resolver.resolveRequest`,
  возвращающим условие source (проверено: export проходит). В `template:check` баг маскируется: `pnpm build` идёт
  раньше `expo export`, `dist` уже есть.
- **F3. `EXPO_PUBLIC_*` в серверном бандле не инлайнится** — читается из `process.env` во время запроса;
  `src/lib/api.ts` бросает на импорте в production → `/section` = 500 без `EXPO_PUBLIC_API_URL` в окружении
  **процесса** web-сервера (на сборке клиентского бандла — тоже нужен).
- **F4. Тёмная тема не применяется после гидрации.** `useColorScheme` react-native-web берёт `matchMedia` в
  `useState` при гидрации, а сервер отрисовал `light`; атрибуты React не правит → у тёмной системной темы экран
  остаётся светлым (Playwright `colorScheme: 'dark'`: фон панели вкладок `rgb(255,255,255)`, ошибок в консоли нет).
- **F5. `useLoaderData` на native** делает `fetch('/_expo/loaders/<route>')` относительно `origin` из `expo-router`
  plugin (`@expo/metro-runtime/src/location/install.native.ts`); в production без `origin` запрос падает. Т.е.
  «тот же экран» с `useLoaderData` делает native-приложение зависимым от web-сервера.
- **F6. SSR-метаданные**: Expo для server output рекомендует `generateMetadata` (из `expo-router/server`, метаданные
  в первых байтах потока), `<Head>` — для обновления после гидрации. Проверено: OG-теги, loader-данные
  (`__EXPO_ROUTER_LOADER_DATA__`) и контент экрана — в HTML ответа.
- **F7. Middleware Expo не читает тело запроса** (immutable request) → проксировать `/v1` через `+middleware.ts`
  нельзя; web-клиент в dev (`:8081`) ходит в API (`:3000`) кросс-доменно — **CORS блокирует** «Раздел» (Playwright).
- **F8. `expo-server/build/mjs` ломается в Node ESM** (импорты без расширений) — адаптер подключать через CJS
  (`createRequire` / `require`). Адаптер `expo-server/adapter/http` есть, но в доках SDK 58 описан только Express.
- **F9. PWA**: Chromium `Page.getInstallabilityErrors` в контексте Playwright даёт только `in-incognito`
  (manifest и SW валидны) — проверка installable реальна при фильтре этой причины или persistent context.
- **F10. Вес JS** production web (Главная): entry 290 КБ + common 137 КБ gzip ≈ 430 КБ (оценка ADR 300–500 КБ).
- **F11. Публикация пакетов vs шаблон в PR.** `template:check` в PR рендерит HEAD шаблона, но ставит последний
  опубликованный `@rkarakulov/ui@0.1.2` (без web-варианта и фикса F4). Новые web-поведения ui проверяются в базе
  (jest web + smoke), в шаблоне — только после публикации (`template-release-check --strict`).

Рекомендации (R) — приняты в §11, если оркестратор не решит иначе:
- **R1 (F1).** В ui модули с платформенными файлами импортируются **без расширения** (`./date-field`), остальные —
  как сейчас. Правило — в AGENTS.md базы §4 и комментарии `index.ts`; сторож — smoke jest web на `dist`
  (`DateField` → `input[type=date]`). Альтернативы: `imports`-поле с условием `browser` (Expo node-сервер его не
  видит — SSR рендерил бы native-вариант); `Platform.select` в компоненте (тянет datetimepicker в web-бандл,
  противоречит §3 scope) — отклонены.
- **R2 (F2).** `metro.config.js.jinja`: `resolveRequest`, возвращающий `@<scope>/source` для всех окружений; в
  `template:check` web-export — **до** `pnpm build` (иначе регрессия не видна).
- **R3 (F3).** Документировать окружение web-сервера (`EXPO_PUBLIC_API_URL` на сборке и в рантайме; серверные
  `API_INTERNAL_URL`, `WEB_ORIGIN` — без `EXPO_PUBLIC_`); `start:web` — `node --env-file-if-exists=.env`; в
  `template:check`/CI — явные значения.
- **R4 (F4).** ui: `theme/color-scheme.ts` (native: `useColorScheme`) + `color-scheme.web.ts` (`useSyncExternalStore`
  с server snapshot `'light'` → после гидрации перерисовка в `dark`); `useTheme`, `DateField` берут схему отсюда.
  Мигание до гидрации — фон `html, body` из токенов с `@media (prefers-color-scheme: dark)` в `+html.tsx`.
- **R5 (F5, уточнение scope «loader + Head»).** Источник данных экрана на всех платформах — API (TanStack Query);
  `loader` — только web-ускоритель SSR. Хук `useLoaderSeed()` в шаблоне: `src/lib/loader-seed.ts` (native →
  `undefined`) + `loader-seed.web.ts` (`useLoaderData()`), результат — `initialData` запроса. OG — `generateMetadata`;
  `<Head>` — `<title>` после клиентской навигации. Альтернатива «`useLoaderData` везде + `origin` в plugin» —
  отклонена (native зависит от web-сервера, нет домена).
- **R6 (F6/безопасность).** `og:url` и абсолютные URL — из `WEB_ORIGIN` (env сервера), не из `Host`/`request.url`
  (подмена заголовка → отравление кеша/превью). Нет `WEB_ORIGIN` — `og:url` не выводится.
- **R7 (F8).** Сервер — Express-адаптер (`expo-server/adapter/express`, путь из доков SDK 58) + `express.static`
  для `dist/client` (traversal, ETag, dotfiles — готовые) + middleware заголовков безопасности. Без compression/morgan
  (это Caddy). Альтернатива — `adapter/http` + свой static (0 зависимостей, но свой security-чувствительный код).
- **R8 (F7, расширение scope).** CORS в API шаблона: `CORS_ORIGINS` (список, пусто → CORS выключен),
  `app.enableCors({ origin: [...], credentials: false })` — `@fastify/cors` уже зависимость `@nestjs/platform-fastify`;
  `.env.example` — dev-origin web. Прод — один origin через reverse proxy (Caddy, F5b). Credentials/cookie — F5b/F6.
  Без R8 AC1 («вкладки работают в браузере») для «Раздела» в dev не выполним.
- **R9 (PWA).** Manifest — API-маршрут `src/app/manifest.webmanifest+api.ts` (цвета из `@<scope>/design-tokens`,
  имя — `project_name`; без hex в коде; проверено). SW — без Workbox (рекомендация Expo, но +зависимость и HTML
  в precache не нужен): скрипт после export генерирует `dist/client/sw.js` — precache только хешированной статики
  `/_expo/static/**` и `/assets/**`, версия кеша = хеш списка, `activate` удаляет старые кеши, `fetch` — только GET
  same-origin из списка (HTML, `/v1`, `/_expo/loaders`, manifest — мимо SW). Регистрация — в `+html.tsx` только при
  `NODE_ENV === 'production'`.
- **R10 (ui-kit в браузере).** В production `/ui-kit` → `Redirect` на Главную (так и остаётся). Проверка витрины в
  браузере — на dev-экспорте (`expo export -p web --dev`, проверено: SSR витрины работает, ~16 с) вторым
  `webServer` Playwright.
- **R11 (jest).** `jest-expo/universal` (4 платформы) не берём: явные `projects` — native (`jest-expo/ios`, как сейчас)
  и web (`jest-expo/web`, jsdom, `@testing-library/react`; RNTL с react-native-web не работает). Web-тесты —
  `*.web.test.ts(x)`, native-проект их исключает. `renderRouter` — только native; маршруты в браузере — Playwright.
- **R12 (Playwright в CI).** `channel: 'chrome'` — Google Chrome предустановлен на `ubuntu-latest`: без загрузки
  браузера и без кеша. Локально — свой Chrome или `PW_CHANNEL=chromium` + `pnpm exec playwright install chromium`
  (~150 МБ). `@playwright/test` ≈ 14 МБ. Смоук: 4–5 тестов, ~5–10 с.
- **R13 (SSR-безопасность кода).** Правило в `app.md`: на уровне модуля и в рендере — без `window`/`document`/
  `localStorage`; браузерное — в эффектах или `.web`-файлах; текст, зависящий от времени/часового пояса, не
  рендерить на сервере (рассинхрон гидрации). Локаль SSR — базовая; `Accept-Language`/cookie — F5b/F6.

Недоопределённость, закрытая по умолчанию: публичный экран-образец шаблона — `/status` («Статус сервиса»: loader
ходит в `/v1/health` через `API_INTERNAL_URL`, при ошибке/без env — `unknown`, не 500); og:image 1200×630 — вне F5a
(серверный рендер картинки — F5b/ADR-0001).

## 8.2 Deviations from spec
- Рекомендации architect R1–R13 (§8.1) приняты автором (автономный режим, 2026-10-23), в т.ч. расширение scope:
  `CORS_ORIGINS` в API шаблона (R8 — web в dev и API на разных origin); данные экранов — TanStack Query на всех
  платформах, loader на web — только посев SSR (`useLoaderSeed`), OG — `generateMetadata` (R5); импорты в `@rkarakulov/ui`
  без расширений, чтобы работали `.web` варианты (R1); `resolveRequest` в metro.config для SSR-бандла; сервер — Express
  адаптер `expo-server`; SW без Workbox; Playwright на системном Chrome; `template-release-check` с `--strict --e2e`.

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
Уточнено architect: AGENTS.md базы §4 — импорт платформенных модулей ui без расширения (R1); runbook шаблона —
env web-сервера (R3, R6), CORS (R8), браузер для Playwright (R12); `template/docs/adr/0001-stack.md` — платформы;
`apps/app/AGENTS.md` — web-команды; README базы — web-шаги `template:check` и `--e2e`.

## 11. Implementation Context
Репозиторий — `app-foundation`, ветка `feature/f5a-web` от `main` (`v0.1.2`). Пути ниже — от его корня.

### ENTRY POINTS
- ui: `packages/ui/src/components/ui/index.ts` (экспорт `DateField`), `packages/ui/src/theme/theme.ts` (`useTheme`).
- Шаблон: `template/apps/app/app.json.jinja` (`web.output`), `metro.config.js.jinja`, `src/app/_layout.tsx`,
  новый `src/app/+html.tsx`, `package.json.jinja` (скрипты `build:web` / `start:web` / `e2e:web`).
- Проверки: `scripts/check-template.mjs`, `.github/workflows/ci.yml`, `template/.github/workflows/ci.yml.jinja`.

### FILES TO CREATE / MODIFY
**A. `@rkarakulov/ui` и база (исполнитель A)**
- `packages/ui/src/components/ui/date-field.web.tsx` — новый: `<input type="date">` через `unstable_createElement`
  из `react-native-web` (RN-стили → CSS корректно, `lineHeight` в px), внутри `FieldFrame` (подпись, ошибка, helper,
  disabled — как у native); `value`/`min`/`max` — те же `YYYY-MM-DD`; `onChange` — строка; `onBlur`;
  `color-scheme` по теме; `initialPickerDate` на web игнорируется (JSDoc). Те же `DateFieldProps`.
- `packages/ui/src/components/ui/index.ts` — `export … from './date-field'` **без расширения** (R1) + комментарий-правило.
- `packages/ui/src/theme/color-scheme.ts` + `color-scheme.web.ts` — новые (R4); `theme/theme.ts`, `date-field.tsx` —
  схема через них (импорт без расширения).
- `packages/ui/src/components/ui/skeleton.tsx` — `useNativeDriver` только native (флаг файлами
  `lib/native-driver.ts` / `.web.ts`; RNW на `true` пишет предупреждение).
- `packages/ui/src/types/react-native-web.d.ts` — новый: объявление `unstable_createElement` (у RNW нет типов).
- `packages/ui/jest.config.js` — `projects`: native (как сейчас, `testPathIgnorePatterns` `\.web\.test\.`) и web
  (`preset: 'jest-expo/web'`, `customExportConditions: ['@app-foundation/source', 'browser']`, свой setup без мока
  datetimepicker); `packages/ui/jest.setup.web.ts` — новый.
- `packages/ui/src/components/ui/date-field.web.test.tsx`, `src/theme/theme.web.test.tsx` (гидрация: `renderToString`
  при светлой схеме → `hydrateRoot` при тёмной → после эффектов тёмные цвета), `src/components/ui-kit.web.test.tsx`
  (все разделы витрины рендерятся в react-native-web) — новые.
- `packages/ui/package.json` — `peerDependencies` + `peerDependenciesMeta.optional`: `react-native-web`, `react-dom`;
  devDeps: `react-native-web`, `react-dom`, `@testing-library/react` (catalog).
- `pnpm-workspace.yaml` (база) — catalog: `react-dom: 19.3.0`, `react-native-web: ~0.21.4`,
  `'@testing-library/react': ^16.3.3`; `pnpm-lock.yaml`.
- `smoke/jest/jest.config.cjs` — второй проект web; `smoke/jest/ui.web.test.tsx` — новый: `DateField` из `dist` →
  `input[type=date]` (сторож R1 в опубликованном виде).
- `.changeset/<name>.md` — minor (fixed-группа → `0.2.0`); `README.md` базы — «Подключение пакетов», п. 5: web-проект
  jest; `AGENTS.md` базы §4 — правило R1, §3 — что делает `template:check` (web).

**B. Шаблон `apps/app` (исполнитель B)** — все `template/apps/app/*`, кроме отмеченных «как есть», — `.jinja` там,
где нужен `npm_scope`/`project_name`.
- `app.json.jinja` — `web.output: "server"`, `web.favicon` (как есть), без `origin` у plugin.
- `metro.config.js.jinja` — `resolveRequest` с условием `@[[ npm_scope ]]/source` для всех окружений (R2).
- `package.json.jinja` — deps: `@expo/metro-runtime: ~58.0.15`, `expo-server: ~58.0.5`, `express: ^5.3.0`
  (`react-dom 19.3.0`, `react-native-web ~0.21.4` уже есть); devDeps: `@playwright/test: catalog:`,
  `@testing-library/react: catalog:`, `@types/express: ^5.0.6`, `@types/node: catalog:` (для `server/`, `scripts/`;
  в них — без алиасов `@/`, импорты с `.ts`: Node 24 strip types); скрипты: `build:web` = `expo export -p web &&
  node scripts/build-service-worker.ts`, `build:web:dev` = `expo export -p web --dev --output-dir dist-dev`,
  `start:web` = `node --env-file-if-exists=.env server/main.ts`, `e2e:web` = `playwright test`; описание — без «web — позже».
- `server/main.ts` (запуск) + `server/web-server.ts` (фабрика `createWebServer({ dist, headers })`: `express.static`
  `dist/client` — `/_expo/static/**` `immutable` 1 год, остальное `no-cache`; затем
  `require('expo-server/adapter/express').createRequestHandler({ build: dist/server })`; заголовки: `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: frame-ancestors 'none';
  base-uri 'self'; object-src 'none'` (без `script-src`: гидрация и loader-данные — inline-скрипты Expo), `PORT`/`HOST`
  из env; `server/web-server.test.ts` — новые, «как есть» (без Jinja). Node 24 запускает `.ts` (strip types);
  adapter — через `createRequire` (F8).
- `src/app/+html.tsx.jinja` — новый: `useServerDocumentContext` (все 4 поля), `lang` — базовая локаль i18n проекта,
  viewport `width=device-width, initial-scale=1, viewport-fit=cover`, `theme-color` light/dark (`media`) из
  `themes.*.surface.default`, фон `html, body` из токенов с `prefers-color-scheme` (R4), `<link rel="manifest">`,
  `apple-touch-icon`, `apple-mobile-web-app-capable`, `<ScrollViewStyleReset />`, регистрация `/sw.js` только в production.
- `src/app/manifest.webmanifest+api.ts.jinja` — новый (R9): `name`/`short_name` = `project_name`, `start_url: "/"`,
  `display: "standalone"`, `theme_color`/`background_color` из токенов, иконки 192/512 + maskable 512;
  `Content-Type: application/manifest+json`.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180) — новые, из
  `assets/images/icon.png` (бинарные, «как есть»).
- `src/web/service-worker.ts` (чистые функции: список precache из путей `dist/client`, версия = хеш списка, текст SW) +
  `src/web/service-worker.test.ts`; `scripts/build-service-worker.ts` — CLI, пишет `dist/client/sw.js` (R9).
- `src/app/status.tsx.jinja` — новый публичный экран (R5): `loader` (`API_INTERNAL_URL` → `/v1/health`, разбор схемой
  из `@[[ npm_scope ]]/contracts`, ошибка/нет env → `null`, без 500), `generateMetadata` (title, description,
  `openGraph` title/description/type/site_name, `og:url` из `WEB_ORIGIN` — R6), `<Head><title>`; данные —
  `useQuery(['health'], api.health, { initialData: useLoaderSeed() ?? undefined })` + `AsyncContent`/скелетон
  (§4.12); доступен гостю, вне вкладок; `src/app/_layout.tsx` — `<Stack.Screen name="status" />`.
- `src/lib/loader-seed.ts` + `src/lib/loader-seed.web.ts` — новые (R5).
- `packages/i18n` шаблона (`template/packages/i18n/src/**`, `.jinja` по месту) — ключи `status.*` ru/en (тест полноты
  словаря уже есть).
- `src/lib/api.ts.jinja` — без изменения логики; JSDoc: на сервере `EXPO_PUBLIC_API_URL` читается в рантайме (F3).
- `jest.config.js.jinja` — `projects` native/web (R11); native `testMatch` + `server/**/*.test.ts` (докблок
  `@jest-environment node`); `jest.setup.web.ts` — новый.
- Тесты web: `src/lib/loader-seed.web.test.ts`, `src/components/tab-bar.web.test.tsx` (вкладки в react-native-web:
  роли `tab`, выбранная) — новые; native: `src/__tests__/status.test.tsx.jinja` (экран без loader-данных: заголовок
  сразу, скелетон, данные API, ошибка с повтором), `app-routes.ts` + `status`.
- `playwright.config.ts` — новый, «как есть»: два `webServer` — production (`start:web`, порт из env, `dist`) и dev
  (`dist-dev`), `channel` из `PW_CHANNEL` (по умолчанию `chrome`, R12), `retries: CI ? 1 : 0`.
- `e2e/web.spec.ts` — новый: Главная SSR + гидрация + переход на «Раздел»; `/status` — заголовок в HTML до JS и после
  гидрации, `og:title`; `/ui-kit` на dev-сборке — заголовок и разделы витрины, в production → Главная; PWA —
  manifest без ошибок (`Page.getAppManifest`), `getInstallabilityErrors` без причин кроме `in-incognito` (F9),
  `navigator.serviceWorker.ready`; на всех страницах — нет `pageerror` (ошибки гидрации).
- `.gitignore` (app) — `dist-dev/`, `test-results/`, `playwright-report/`; `AGENTS.md` (app, Expo-текст) — команды web.
- `template/apps/api/src/main.ts.jinja`, `src/config/env.ts` + `env.test.ts`, `.env.example.jinja` — `CORS_ORIGINS` (R8).
- `template/pnpm-workspace.yaml.jinja` — catalog: `'@playwright/test': 1.64.1` (точно: версия = ревизия браузера
  Playwright), `'@testing-library/react': ^16.3.3` (`apps/admin` переходит на `catalog:`).
- `template/turbo.json` — задачи `build:web` (`outputs: dist/**`, env `EXPO_PUBLIC_*`), `e2e:web` (`dependsOn: build:web`,
  `cache: false`); `template/package.json.jinja` — `build:web`, `e2e:web` через turbo.
- `template/.github/workflows/ci.yml.jinja` — job `web`: install → `pnpm build:web` → `pnpm e2e:web`
  (`EXPO_PUBLIC_API_URL`, `PW_CHANNEL=chrome`).

**C. Проверки базы (исполнитель B)**
- `scripts/check-template.mjs` — шаги: `expo export --platform web` **до** `pnpm build` (R2) с `EXPO_PUBLIC_API_URL`;
  после смоука API — `build:web` (SW), запуск `start:web` на свободном порту (`start()` скрипта), `curl`-проверки (ниже);
  флаг `--e2e` → `pnpm --filter @<scope>/app e2e:web` (нужен Chrome или `PW_CHANNEL`). Шапка-комментарий — новые шаги.
- `.github/workflows/ci.yml` — `template`: `--e2e` только в ноге `use_postgis: false`; `release.yml` —
  `template-release-check`: `-- --strict --e2e` (там впервые проверяются новые ui-фиксы в шаблоне, F11).

**D. Процесс и документы (исполнитель B после B-слайсов, или A после A)**
- `template/AGENTS.md.jinja` — §4.13 «Все платформы»: iOS, Android и web/PWA с тем же функционалом; развилки — только
  файлами `.web`/`.native` рядом; экраны о платформе не знают; публичные экраны — SSR (`generateMetadata` + loader как
  ускоритель); §3 — команды `build:web`, `start:web`, `e2e:web`.
- `template/.claude/rules/app.md.jinja` — правила web: R5, R6, R13, SW только статика, `EXPO_PUBLIC_*` — не секреты.
- `template/tools/ai_review/review_contract.md` — явная строка «нет web-варианта экрана/модуля — HIGH».
- `plugin/skills/mobile-expo/SKILL.md` — §6: проверка экрана в браузере (`build:web` + `start:web` / `e2e:web`) в
  VERIFY; затем `pnpm template:sync` (`.ai/dev-kit` — только так).
- `template/docs/adr/0001-stack.md` (платформы), `template/docs/runbooks/local-dev.md.jinja` (web: dev `w`, сборка,
  сервер, env, PWA, локальный браузер Playwright), `template/README.md.jinja`, `README.md` базы («Разработка шаблона»:
  web-шаги и `--e2e`); `.changeset` — шаблон в той же minor.
- on-bike: `docs/tasks/2026-10-22-app-foundation/design.md` — строка F5a (после merge).

### TYPES / CONTRACTS
- `DateFieldProps` — без изменений (обе реализации экспортируют один тип; d.ts — от native-файла).
- `useColorScheme(): 'light' | 'dark'` (внутренний модуль ui, не публичный API); `useTheme` — сигнатура та же.
- `useLoaderSeed<T>(): T | undefined` (шаблон). `loader: LoaderFunction<HealthResponse | null>`,
  `generateMetadata: GenerateMetadataFunction` — из `expo-router/server`.
- Контракты API не меняются. env API: `CORS_ORIGINS` (строка со списком origin, zod: каждый — `url()` без пути).
- env web-сервера: `PORT`, `HOST`, `EXPO_PUBLIC_API_URL`, `API_INTERNAL_URL`, `WEB_ORIGIN` — в runbook и `.env.example`.

### TESTS / CHECKS
- ui jest: native-проект — все текущие зелёные; web — `DateField` (тип `date`, значение/min/max/disabled, onChange
  строкой, ошибка и helper, подпись), гидрация темы (F4), витрина целиком. `pnpm build && pnpm smoke` — web-проект на `dist`.
- Шаблон jest: native (`status`, текущие), web (`loader-seed.web`, панель вкладок), `service-worker` (только хешированная
  статика; HTML, `/v1`, `/_expo/loaders`, `manifest` — не в списке; версия меняется при смене списка),
  `web-server` (заголовки безопасности на HTML и статике; `/_expo/static` — `immutable`; `../` вне `dist/client` → не
  отдаётся), env API (`CORS_ORIGINS` валидируется; пусто → CORS выкл.).
- `template:check` (curl, оба `use_postgis`): `GET /` 200, в HTML заголовок Главной (SSR не пустой); `GET /status` 200,
  `og:title`/`og:description`, `__EXPO_ROUTER_LOADER_DATA__`; `GET /manifest.webmanifest` — `application/manifest+json`,
  `display: standalone`, `theme_color` = `content` у `meta[name=theme-color]` светлой темы, иконки 192/512 → 200
  `image/png`; `GET /sw.js` — содержит путь entry-бандла из HTML, не содержит `/v1`, `Cache-Control: no-cache`;
  заголовки безопасности; `GET /nope` → 404. С `--e2e` — Playwright.
- Порядок проверок: после каждого слайса — его тесты + `pnpm check` (база); после B-слайсов —
  `pnpm template:check` и `pnpm template:check -- --data use_postgis=true` (локально PG/Redis), с `--e2e` хотя бы раз;
  финально — `claude plugin validate --strict .`, CI зелёный.

### OUT OF SCOPE
Сессия/cookie/CSRF в вебе (F5b/F6), credentials в CORS, universal/app links и `origin` native, карты, шеринг,
офлайн-данные, og:image 1200×630, `Accept-Language` в SSR, Caddy/Docker web-сервера и удаление Astro (F5b),
Workbox, push, Lighthouse в CI (installability — через CDP).

### Слайсы и порядок (два исполнителя; границы файлов — A: `packages/**`, `smoke/**`, корневые
`pnpm-workspace.yaml`/`pnpm-lock.yaml`, `README.md`/`AGENTS.md` базы; B: `template/**` (кроме `.ai`, `.agents`,
`.codex`), `scripts/check-template.mjs`, `.github/workflows/**`, `plugin/skills/mobile-expo/**`. Changeset — у каждого
свой файл. `pnpm template:sync` запускает только B. Зависимостей A↔B по коду нет (F11): шаблон не использует новых
экспортов ui.)
| # | Исп. | Слайс | Проверка после слайса |
|---|---|---|---|
| A1 | A | R1 + `date-field.web.tsx` + jest `projects` + типы RNW + devDeps | `pnpm --filter @rkarakulov/ui test` (оба проекта), `pnpm check` |
| A2 | A | R4 color-scheme + гидрация, native-driver, витрина web-тест | то же + тест гидрации падает без фикса |
| A3 | A | smoke web на `dist`, changeset, README/AGENTS базы | `pnpm build && pnpm smoke`, `pnpm check` |
| B1 | B | `web.output`, R2 metro, deps, `server/*`, `+html.tsx`, R3, check-template: web export до build + `GET /` | `template:check` (оба варианта) |
| B2 | B | PWA: manifest-маршрут, иконки, SW-генератор + тесты, регистрация | jest шаблона в рендере, `template:check` (manifest/sw/иконки) |
| B3 | B | `/status`: loader, `generateMetadata`, `useLoaderSeed`, i18n, тесты native/web, R8 CORS | `template:check` (OG), тесты API env |
| B4 | B | Playwright: конфиг, `e2e/web.spec.ts`, turbo/скрипты, CI шаблона, `--e2e`, CI/release базы | `pnpm template:check -- --e2e` локально |
| D | B | AGENTS/rules/контракт/скил + `template:sync`, runbook, ADR, README | `pnpm check`, `claude plugin validate --strict .` |
| R | — | ревью (Claude + Codex), PR, релиз `0.2.0`, тег `v0.2.0` (после «да» человека на merge) | CI, `template-release-check --strict --e2e` |

## 12. Outcome
Заполняет coder.
