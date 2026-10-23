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

## 5. Architecture Context
- **copier update** — трёхстороннее слияние: база — рендер `v0.1.2`, «их» — рендер `v0.2.0`, «наши» — on-bike. Пробный
  прогон (§8.1, факты U1–U8) — в копии репозитория; реальный on-bike не менялся.
- **Web on-bike = то же приложение** (ADR-0003): каркас приходит из шаблона (`web.output: 'server'`, `+html.tsx`,
  manifest-маршрут, service worker, Express-адаптер `expo-server`, `online-manager.web`, `loader-seed`,
  `DocumentTitle`, jest-проекты native/web/server, Playwright). Продуктовое — здесь: гарды сессии без блокировки SSR,
  web-хранилище, web-сессия, бренд PWA, смоук регистрации.
- **Сессия в вебе**: NestJS 12.2 (уже в каталоге) умеет cookie и CSRF **без пакетов**: `httpAdapter.setCookie/
  clearCookie` + `@Cookies()` (проверено по `node_modules/@nestjs/{core,common}` 12.2.0 и docs.nestjs.com/techniques/
  cookies) и `app.enableCsrfProtection()` — Fetch Metadata (`Sec-Fetch-Site`) с fallback `Origin`/`Host`, алгоритм Go
  `CrossOriginProtection`; GET/HEAD/OPTIONS пропускаются, запросы без `Sec-Fetch-Site` и `Origin` (native) —
  пропускаются, cross-origin небезопасные — 403 (docs.nestjs.com/security/csrf, `CsrfProtectionOptions`).
  `@fastify/cookie` и `@fastify/csrf-protection` (токены + секрет, `getToken`/`userInfo`) не нужны (R7).
- **Прод — один origin**: Caddy `PUBLIC_HOST` уже отдаёт `/v1/*` → `api:3000`, остальное — сейчас `landing:4321`,
  станет `web:8080`. Cookie первой стороны, CORS выключен. Dev/e2e — web и API на разных портах одного хоста
  (same-site, cross-origin): CORS с credentials только для `CORS_ORIGINS` (R8).

## 5.1 Placement & Reuse Gate
- Каркас web/PWA/SSR, `CORS_ORIGINS`, jest/Playwright — из шаблона, без копий. Файлы шаблона правим только там, где
  on-bike расходится по продукту (перечень — §12 coder).
- Cookie/CSRF — встроенное NestJS 12.2, без новых зависимостей API. Сессия — модуль `identity` on-bike (в шаблоне
  auth нет). Конфигурация HTTP on-bike (CORS + CSRF) — одна функция `apps/api/src/http-app.ts`, её зовёт `main.ts`
  и unit-тест (R9). Кандидат в базу (follow-up): хук `configureApp` в `createApiHarness` test-kit.
- Платформенные развилки — файлами рядом (`.web.ts`), без `Platform.OS` в экранах. Web-клиент API — опции
  `@on-bike/api-client` (`credentials`), без второго клиента.
- `@rkarakulov/ui` 0.2.0 уже даёт web `DateField`, `useTheme` после гидрации, `aria-*` — своих web-компонентов нет.

## 6. Relevant Files
- Шаблон: app-foundation `v0.2.0` (`template/**`), F5a — `git show feature/app-foundation-f5a:docs/tasks/2026-10-23-app-foundation-f5a-web/task.md` (§8.1 F1–F11, R1–R13).
- API: `apps/api/src/{main.ts,config/env.ts}`, `modules/identity/{auth.controller,registration.service,session.service,identity.repository,identity.policy}.ts`, `test/harness.ts`.
- Контракты/клиент: `packages/contracts/src/auth/{session,registration}.schema.ts`, `packages/api-client/src/index.ts`; `@rkarakulov/api-client-core` (`createHttpClient`, `request(path, schema, init)`).
- App: `src/app/_layout.tsx`, `(tabs)/_layout.tsx`, `(onboarding)/{_layout,register,check-email}.tsx`, `auth/verify/[token].tsx`, `features/auth/{session-store,registration-store,secure-storage,use-sign-in-when-verified,queries}.ts`, `lib/api.ts`, `components/screen-placeholder.tsx`.
- Landing и хвосты: `apps/landing/**`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.dependency-cruiser.cjs`, `eslint.config.mjs`, `package.json`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`, `infra/{Caddyfile,docker-compose.prod.yml}`, `.claude/rules/onbike-{web,security}.md`, `packages/i18n/src/ru.ts` (`landing.openInApp`).

## 7. Implementation Notes
- **Порядок merge-а copier:** конфликты решать по таблице U4 (§8.1); `_commit` и `_src_path` в `.copier-answers.yml`
  поправить руками (U2) — не «перезапускать update».
- **SSR-безопасность сторов:** zustand-сторы — синглтоны модуля, на сервере общие для всех запросов. На сервере их
  никто не меняет (гидрация — в эффектах); правило: ни сторы, ни `api` не вызываются в рендере/на уровне модуля.
- **Время в SSR:** обратный отсчёт повтора письма (`check-email`) и прочие тексты от `Date.now()` — только после
  монтирования (R13 F5a), иначе ошибка гидрации #418.
- **Cookie refresh:** `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/session; Max-Age=<остаток срока>`, без `Domain`.
  Имя — `__Secure-onbike_rt`; если Chrome на `http://127.0.0.1` (e2e) не примет префикс — `onbike_rt` (проверка — первый
  шаг S4, результат — в §8.2). `Path=/` (и префикс `__Host-`) не берём: cookie уходила бы на каждый SSR-запрос web-сервера.
  Путь сужен относительно scope (`/v1/auth`) до `/v1/auth/session`: cookie не уходит на регистрацию и ссылки писем.
- **Dev web и cookie:** открывать web на том же хосте, что API: `http://127.0.0.1:8081` при `EXPO_PUBLIC_API_URL=
  http://127.0.0.1:3000` (`localhost` ↔ `127.0.0.1` — разные сайты, `SameSite=Strict` cookie не пошлёт). Runbook.
- **Иконки PWA on-bike:** из марки `assets/images/splash-route-{light,dark}.png` (1024²) — `sips` (macOS): 192/512,
  apple-touch 180, maskable 512 — марка ~80 % в safe zone на фоне `themes.light.surface.default`. Файлы коммитятся
  (генератор не нужен — одноразово); `app.json web.favicon` — та же марка 48². Нативная иконка `icon.png` — дефолтная
  Expo, вне F5b (вопрос Q1).

## 8. Risks / Assumptions / Open Questions
- **NOT VERIFIED в пробе:** `pnpm install` в копии не прошёл — нет `NODE_AUTH_TOKEN` в окружении architect
  (401 от GitHub Packages); typecheck/тесты/export после merge — первым шагом S1.
- **Stack.Protected и SSR:** по докам Expo «protected screens are evaluated only on the client» — как рендерит
  сервер группу с `guard`, проверять спайком в начале S3 (curl `/`, `/register`, `/auth/verify/x`). План Б — гард
  в `_layout` групп (`<Redirect>` после гидрации, скелетон пока `unknown`).
- **Ротация refresh и несколько вкладок:** одновременная перезагрузка двух вкладок → оба запроса со старой cookie →
  второй 401. Снимается Web Locks (`navigator.locks.request('onbike.session-refresh')`) в web-реализации; без
  обнаружения повторного использования (reuse detection) в F5b — слайс 2.
- **Secure cookie по http в dev/e2e:** Chrome/Firefox считают `localhost`/`127.0.0.1` безопасным контекстом;
  Safari на `http://` Secure-cookie не хранит → ручной смоук в Safari — только через https (Caddy локально) или
  принять как ограничение dev (runbook).
- **Вес JS** (F10 F5a: ~430 КБ gzip у шаблона) — on-bike добавит формы/zod; замер в pr.md.

## 8.1 Requirements Consistency
Architecture Review — onbike-web. **Status: CONCERNS** (блокеров нет; R1–R12 приняты architect-ом по умолчанию,
автономный режим; R4 — расширение scope API, оркестратор может отклонить; Q1–Q2 — человеку, не блокируют).

Пробный `copier update` (клон `feature/onbike-web` в scratchpad, `_src_path` → локальная база, `uvx copier@9.19.1
update --defaults --vcs-ref v0.2.0 --skip-answered`). Факты:
- **U1. Конфликтов 11, `.rej` нет.** Чисто слились 20 файлов, новых 19 путей (каркас web). Удалённые в on-bike файлы
  шаблона (`(tabs)/section.tsx`, `section.test.tsx`, `query-wrapper.tsx`, `splash-icon.png`, `0001-stack.md`) **не
  вернулись** — copier уважает удаление, но правки шаблона в них теряются молча (R3 F3b).
- **U2. `_commit: '@rkarakulov/api-client-core@0.2.0'`** вместо `v0.2.0` — copier берёт тег пакета на том же коммите
  (известный follow-up F3b S5(б), не исправлен в базе). AC1 требует `v0.2.0` → правка руками + `_src_path: gh:…`.
- **U3. Каталог `@rkarakulov/*` → 0.2.0** — слит автоматически; `@testing-library/react`, `@playwright/test` 1.64.1 в
  каталог; в app — `@expo/metro-runtime`, `expo-server`, `express`, `@types/express`, `@playwright/test`,
  `@testing-library/react`, `@types/node`, скрипты `build:web`, `build:web:dev`, `start:web`, `e2e:web`.
- **U4. Конфликты и решение:**

  | Файл | Наше | Шаблон | Решение |
  |---|---|---|---|
  | `AGENTS.md` §2 | `landing/` + описание app/admin on-bike | app + `server/`, admin кратко | шаблон по app (+ «райдера»), admin on-bike, строки landing нет (S2) |
  | `AGENTS.md` §4.13 | ADR-0003 + «Переход» | «Фича = все платформы», SSR/loader/`generateMetadata` | текст шаблона + ссылка на ADR-0003; «Переход» удалить (основа сделана) |
  | `docs/runbooks/local-dev.md` | identity-переменные, Expo Go | `CORS_ORIGINS`, раздел «Web» | оба + web-сессия (cookie, `127.0.0.1:8081`, `APP_LINK_BASE` для web) |
  | `eslint.config.mjs` | `**/.astro/**` | `dist-dev`, Playwright-отчёты | шаблон (Astro уходит в S2) |
  | `pnpm-workspace.yaml` | `@fontsource/playfair-display` | `@testing-library/react`, `@playwright/test` | оба |
  | `packages/i18n/src/ru.ts` | `admin.title` on-bike | `status.*`, `admin.title` шаблона | `status.*` + наш `admin.title`; вернуть `apiStatus.title` (его требует `api-status.tsx`); `landing.openInApp` — удалить (S2) |
  | `apps/app/package.json` | Playfair, `expo-secure-store`, description | metro-runtime, expo-server, description | все зависимости; description — шаблона с «райдера» |
  | `apps/app/src/app/_layout.tsx` | импорты сторов | `online-manager` | оба импорта; гарды — переделка S3 (R2) |
  | `apps/app/src/__tests__/app-routes.ts` | комментарий | комментарий + `status` | объединить |
  | `apps/api/.env.example` | секреты identity | `CORS_ORIGINS` | оба (+ `127.0.0.1:8081` уже в списке) |
  | `apps/api/src/config/{env,env.test}.ts` | `Secret`, JWT/EMAIL/APP_LINK/AGREEMENT | `corsOrigins`, `CORS_ORIGINS`; тесты почты/CORS/адресов | оба; в тесте закрыть `it` «секреты» (при склейке теряется `});`) |
- **U5. Новый `status.tsx` не компилируется в on-bike:** `ScreenPlaceholder` on-bike без `lead`, нет ключа
  `apiStatus.title`; `status.test.tsx` импортирует удалённый в on-bike `__tests__/query-wrapper.tsx`.
- **U6. `e2e/web.spec.ts` шаблона проверяет «Раздел» (`/section`)** — в on-bike его нет; смоук переписывается под on-bike.
- **U7. Корневой layout on-bike не даст SSR:** `if (!ready) return null`, где `ready` ждёт `hydrate()` сессии и
  регистрации из эффектов — на сервере эффекты не выполняются → HTML любого маршрута пустой (по коду, без запуска).
- **U8. CI `web` шаблона — без API** («Нет соединения»); AC2 (регистрация → письмо → вход) требует API, БД, Redis,
  worker и Mailpit в job.

Найдено в коде API (до решений):
- **A1. Эндпоинтов, читающих refresh, нет:** сессию выдаёт только `POST /v1/auth/registration/poll`; `Session` в
  контракте — «ротация refresh и вход — слайс 2». Без refresh-эндпоинта web теряет вход на каждой перезагрузке
  (access только в памяти), а cookie и CSRF защищали бы пустоту.
- **A2. `createApiHarness` (test-kit 0.2.0) не даёт хука до `app.init()`**, а `enableCsrfProtection` вызывается до
  init → интеграционные тесты identity идут без CSRF.
- **A3. `@nestjs/platform-fastify` регистрирует `@fastify/formbody`** — form-POST с другого сайта парсится; это
  классический CSRF-вектор для cookie-эндпоинтов → глобальная Fetch-Metadata-проверка обязательна.

Решения (R) — приняты в §11, если оркестратор не решит иначе:
- **R1 (U2).** После update: `_commit: v0.2.0`, `_src_path: gh:rkarakulov/app-foundation` — руками, отдельным
  шагом S1; в §12 — follow-up в базу повторно (тег `v*` при `copier update`, напр. `--vcs-ref` + проверка в CI шаблона).
- **R2 (U7, SSR и гарды).** Корень ждёт только шрифты (как шаблон); `SplashScreen.hideAsync()` — когда шрифты
  и гидрация сессии/регистрации готовы (на native splash закрывает дерево, на web его нет). Гарды допускают
  `unknown`: `(tabs)` — `guard={status !== 'signedOut'}`, `(onboarding)` — `guard={status !== 'signedIn'}`;
  пока `unknown`, `(tabs)/_layout` рисует скелетон оболочки (не контент). Публичные маршруты (`auth/verify/[token]`,
  `status`, `ui-kit`) — вне гардов. Итог: SSR отдаёт HTML для `/register`, `/auth/verify/*`, `/status`; `/` — скелетон,
  после гидрации — вход или `/register`. Без `Platform.OS`. Альтернативы: держать `return null` на web (нет SSR —
  против ADR-0003 п. 2); читать cookie на SSR-сервере (refresh уходил бы на web-сервер, `Path=/`) — нет.
- **R3 (`/status`).** **Оставить** экран шаблона: образец публичного SSR (на него ссылается `app.md`), смоук CI без
  API, ноль расхождений с шаблоном. Починка U5: `ScreenPlaceholder` on-bike получает необязательный `lead`
  (без него — «Скоро здесь…»), `apiStatus.title` в словарь, `__tests__/query-wrapper.tsx` вернуть из шаблона (минус
  одно «удалённое» отличие). Публичный продуктовый экран on-bike с OG — `auth/verify/[token]`: `generateMetadata`
  (нейтральный заголовок, **без e-mail**, `og:url` не выводится — в пути токен), без `loader` (e-mail в HTML не
  нужен, данные — API как сейчас). OG объектов (заезд, маршрут…) — с экранами объектов; «заготовка» = `generateMetadata`
  на verify + `register` и правило в `onbike-app.md`. Альтернатива «удалить `/status`» — минус образец и плюс
  4 удалённых файла шаблона (тихие потери правок при update).
- **R4 (A1, расширение scope).** В F5b — **минимальный жизненный цикл web-сессии:** `POST /v1/auth/session/refresh`
  (ротация: новый refresh взамен старого, срок сессии **не продлевается**; отозванная/истёкшая/удалённый пользователь
  → 401) и `POST /v1/auth/session/sign-out` (отзыв `revoked_at`, идемпотентно 204). Оба принимают refresh **из тела**
  (native, слайс 2 подключит) **или из cookie** (web); ответ — по тому же транспорту. Native-клиент в F5b их не зовёт
  (без изменений). Reuse detection, вход по паролю, продление — слайс 2. Альтернативы: (б) только выставить cookie
  в poll, refresh — слайс 2: web теряет вход при каждой перезагрузке, AC3 «CSRF» проверять не на чем; (в) access в
  `sessionStorage` — против ADR-0003 п. 4. Рекомендую (а).
- **R5 (контракт транспорта).** Транспорт задаёт клиент явно: `sessionTransport: 'body' | 'cookie'` (необязательное,
  по умолчанию `body`) в `RegistrationPollRequest`; для refresh/sign-out — «`refreshToken` в теле → body, иначе
  cookie». Ответ: `Session` (body) или `CookieSession = Session.omit({ refreshToken })` (cookie). Старые сборки
  native шлют без поля — получают как сейчас. Альтернативы: заголовок `X-Client` (вне контракта, contracts-first
  нарушен); угадывать по `Origin`/`Sec-Fetch-*` (неявно, ломается на прокси) — нет.
- **R6 (A3, CSRF).** `app.enableCsrfProtection({ trustedOrigins: CORS_ORIGINS })` глобально + `SameSite=Strict` +
  JSON-тело (`content-type: application/json` — preflight для cross-origin). Токенный `@fastify/csrf-protection` — нет:
  нужен второй секрет, cookie `_csrf`, изменения клиента; Fetch Metadata поддерживают все evergreen-браузеры, а
  native-запросы без `Origin`/`Sec-Fetch-Site` проходят по алгоритму. Rate-limit refresh — по IP (`RateLimiter`,
  60/мин, как политика в `IDENTITY_POLICY`).
- **R7 (cookie без пакетов).** `HttpAdapterHost.httpAdapter.setCookie/clearCookie` + `@Res({ passthrough: true })`,
  чтение — `@Cookies(name)`; подпись cookie не нужна (значение — случайный токен, в БД — sha256), `cookies.secret`
  не задаём.
- **R8 (CORS в dev).** `enableCors({ origin: CORS_ORIGINS, credentials: true })` — отличие on-bike от шаблона
  (`credentials: false`), в проде список пуст → CORS выключен. Follow-up в базу: опция credentials — когда сессия
  появится в шаблоне.
- **R9 (A2, тест CSRF без базы).** `apps/api/src/http-app.ts`: `configureOnBikeHttp(app, env)` = `configureHttpApp`
  + CORS + CSRF; `main.ts` зовёт её. Unit-тест `http-app.test.ts` (как `http-app.test.ts` в api-kit): тестовый
  контроллер, `inject` с `Sec-Fetch-Site: cross-site` → 403, `same-origin`/без заголовков (native)/trusted origin → 200,
  preflight CORS → `Access-Control-Allow-Credentials`. Интеграционные тесты identity — через harness (cookie работают
  без настройки). Follow-up в базу: `configureApp`-хук в `createApiHarness`.
- **R10 (web-хранилище).** `secure-storage.web.ts` — `sessionStorage` (вкладка, переживает перезагрузку, не
  делится между вкладками) для `onbike.registration`; сессию web **не хранит вовсе**: `session-persistence.ts`
  (native: SecureStore, как сейчас) / `.web.ts` (restore = `refreshSession()` по cookie под Web Lock; persist — no-op;
  clear = `signOut()`). Токен регистрации (24 ч, одноразовый обмен на сессию своего же аккаунта) в `sessionStorage` —
  осознанный компромисс: XSS прочитает его, но и так исполняется в странице. Альтернатива «только память» — потеря
  «Подтвердите e-mail» при перезагрузке вкладки.
- **R11 (U8, e2e).** CI `web` получает services `postgres`/`redis` + `mailpit` (`axllent/mailpit`), миграции, API и
  worker из `dist`; Playwright `webServer` поднимает их (команды из `e2e/`). Смоук on-bike: `/` → `/register`; форма →
  «Подтвердите e-mail»; ссылка из Mailpit API → «Подтвердить» → «E-mail подтверждён»; первая вкладка → вход (Главная);
  перезагрузка — вход сохранён (cookie); `document.cookie` без refresh, тело ответа poll без `refreshToken`; `/status`
  (SSR + OG), `/ui-kit` (dev), PWA. Без API (переменная не задана) — сценарий с регистрацией `skip`, локально тоже.
  Альтернатива — моки `page.route` (быстро, но не проверяет cookie/CSRF сервера) — нет.
- **R12 (landing).** Удаляется целиком (функций нет: `index.astro` — заглушка, фавиконы — дефолт Astro/Vite):
  `apps/landing/**`, `prettier-plugin-astro` (каталог, корень, `.prettierrc.json` → как в шаблоне), `.astro` в
  ignore/depcruise/eslint, `landing` в `designSystemOnly`, Caddy `landing:4321` → `web:8080`, compose `landing` → `web`
  (образ `on-bike-web`, env `EXPO_PUBLIC_API_URL`, `API_INTERNAL_URL=http://api:3000`, `WEB_ORIGIN`, `HOST=0.0.0.0`),
  CI-комментарий, `onbike-web.md` → только admin, `onbike-security.md` paths → без landing, + `apps/app/src/features/auth/**`.

Вопросы человеку (не блокируют, по умолчанию — как указано):
- **Q1.** Нативная иконка приложения (`assets/images/icon.png`) — дефолтная Expo. PWA-иконки делаем из марки
  splash (маршрут + точка старта). Нужна ли отдельная задача на иконку бренда? По умолчанию — PWA из марки, native — как есть.
- **Q2.** Сессия не продлевается при refresh (30 дней от регистрации). Политику продления — в слайсе 2? По умолчанию — да.

## 8.2 Deviations from spec
- Рекомендации architect R1–R12 (§8.1) приняты автором (автономный режим, 2026-10-23), включая расширение scope R4:
  `POST /v1/auth/session/refresh` (ротация, без продления) и `POST /v1/auth/session/sign-out` — без них web-сессия
  теряется при перезагрузке. Cookie `__Secure-onbike_rt`, `Path=/v1/auth/session`; CSRF — встроенный
  `enableCsrfProtection` NestJS 12.2 (Fetch Metadata + Origin) с `trustedOrigins` из `CORS_ORIGINS`; CORS `credentials`
  только для списка origin. Q1 (иконка бренда) — отдельная задача; Q2 (продление сессии) — слайс 2 онбординга.
- **S4, префикс `__Secure-` в Chrome на `http://127.0.0.1` — принимается, имя `__Secure-onbike_rt` остаётся.**
  Проверка 2026-10-23: Playwright 1.64.1 + Google Chrome 156.0.8078.48 (`channel: 'chrome'`), страница
  `http://127.0.0.1:8099`, `fetch(..., { credentials: 'include' })` на API `http://127.0.0.1:3999` (как dev/e2e: тот же
  хост, другой порт). Ответ `Set-Cookie: __Secure-onbike_rt=…; Max-Age=600; Path=/v1/auth/session; HttpOnly; Secure;
  SameSite=Strict` сохранён; cookie ушла на `POST /v1/auth/session/refresh` и не ушла на `/v1/auth/register`;
  `document.cookie` пуст. Chromium Playwright (`PW_CHANNEL=chromium`) не проверялся — браузер нужной ревизии не
  установлен; Safari по `http` Secure-cookie не хранит (§8, runbook).
- **S5, console.error в смоуке (решение оркестратора).** Аноним на каждой загрузке шлёт `POST /v1/auth/session/refresh`
  и получает 401 — Chrome пишет «Failed to load resource … 401» как `console.error`. API не меняется (204 без cookie —
  нет); фильтр `e2e/web.spec.ts` пропускает **только** это сообщение со статусом 401 для URL `…/v1/auth/session/refresh`,
  всё остальное — падение. Уточнение S5: без API (`E2E_API` не задан) дополнительно пропускается
  `net::ERR_CONNECTION_REFUSED` для URL на origin API — иначе «без API — остальное зелёное» невыполнимо. Экран
  `/auth/verify/<неизвестный токен>` после гидрации в смоуке не открывается (404 API в консоли) — шаг SSR-only,
  гидрация verify — в сценарии с API по настоящей ссылке.
- **S5, запуск e2e с API.** `turbo.json` `e2e:web.passThroughEnv` += `E2E_API`, `MAILPIT_URL` (strict env turbo
  иначе отрезал бы флаг); CI job `web` зовёт `pnpm build:web` + `pnpm --filter @on-bike/app e2e:web` напрямую, не
  turbo `e2e:web`: переменные API (БД, Redis, SMTP, секреты-заглушки) turbo задаче не передал бы. API смоука —
  свой процесс (`reuseExistingServer: false`): dev-API на :3000 надо остановить (другие `APP_LINK_BASE`/CORS).

## 8.3 Security checklist
Затронуты сессии и аутентификация (web cookie, CSRF, ротация refresh), публичные страницы (SSR, OG, ссылки с
токеном), конфиг API (`main.ts`, `config/env.ts`, CORS), CI и `infra/` (`.claude/rules/security.md`, `onbike-security.md`).

1. **AuthN/AuthZ.** `refresh`/`sign-out` — владелец refresh-токена (тело или cookie); сессия ищется по sha256 токена,
   условие `revoked_at IS NULL AND expires_at > now` и пользователь не удалён — на сервере, в одной транзакции с
   ротацией (UPDATE … RETURNING; гонка двух refresh — один выигрывает, второй 401). Web: refresh только в cookie
   `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/session`, без `Domain`; access — только в памяти; в теле ответа
   web refresh нет (тест). Native — как сейчас (SecureStore), сервер для `body` отвечает прежним `Session` (тест).
   CSRF: `enableCsrfProtection` глобально (Fetch Metadata + Origin/Host), `trustedOrigins` = `CORS_ORIGINS` (в проде
   пусто); CORS с credentials — только для списка, в проде выключен; `Protected` в Expo Router — не авторизация (доки),
   доступ к данным решает API.
2. **Входные данные.** Тела — zod из `@on-bike/contracts` (`OpaqueToken` 43 символа base64url для refresh из тела и
   cookie — cookie тоже валидируется схемой, мусор → 401 без запроса в БД); `sessionTransport` — enum.
3. **Данные наружу.** Ответ refresh/poll — только токены и сроки; sign-out — 204 без тела. SSR `/auth/verify/*` — без
   `loader`, e-mail в HTML не попадает; `generateMetadata` без e-mail и без `og:url` (в пути токен);
   `Referrer-Policy: strict-origin-when-cross-origin` (web-сервер шаблона) — токен из пути не уходит третьим лицам.
   Service worker не кеширует HTML и `/v1` (шаблон). `Cache-Control: no-store` на всех ответах сессии.
4. **Злоупотребления.** Rate-limit refresh по IP (Redis `RateLimiter`, ключ — HMAC IP, `IDENTITY_POLICY`), 429 с
   `retryAfterSec`; ответы 401 одинаковые для «нет cookie», «нет сессии», «отозвана», «истекла» (без оракула).
5. **Секреты и логи.** Refresh в БД — только sha256 (как сейчас); cookie и тела не логируются (логгер Nest не пишет
   тела; проверить, что `console.warn` клиента не содержит токенов). CI e2e — тестовые значения секретов в workflow
   (не реальные, как `test-env.ts`), gitleaks зелёный. `EXPO_PUBLIC_*` — только публичный адрес API.
   `mailpit` в CI — образ по тегу версии (+ SHA-дайджест, как actions).
6. **Аудит.** Ротация и выход — не «решения модерации/споры» (§4.10 on-bike): append-only журнал не требуется;
   след — `sessions.revoked_at` и смена хеша. Reuse detection (кража refresh) — слайс 2, записано в §12 follow-up.

## 9. Acceptance Criteria
1. `.copier-answers.yml` — `_commit: v0.2.0`; конфликты разобраны, локальные отличия перечислены.
2. Все маршруты on-bike работают в браузере; регистрация → письмо → подтверждение → вход в браузере (Playwright + человек).
3. Web: refresh только в httpOnly cookie, access в памяти, CSRF; native — без изменений (тесты).
4. PWA устанавливается, цвета бренда; SSR отдаёт HTML; `apps/landing` удалён без потери функций.
5. `pnpm check`, web/Android export, Playwright — зелёные; CI зелёный.

## 10. Documentation Impact
AGENTS.md, rules, runbook (web, cookie), architecture, ADR-0001/0003, design.md (F5 сделан).
Architect: AGENTS.md §2 (без landing, `app/server/`), §3 (без landing; `build:web`, `start:web`, `e2e:web`), §4.13 (текст
шаблона + ADR-0003, без «Перехода»), §8 (onbike-web — только admin); `onbike-security.md` (web-сессия: cookie,
access в памяти, CSRF Fetch Metadata), `onbike-app.md` (`generateMetadata` публичных экранов без персональных данных);
runbook — web-сессия в dev (`127.0.0.1:8081`, `CORS_ORIGINS`, `APP_LINK_BASE=http://127.0.0.1:8081/`, Safari),
`infra` web вместо landing; ADR-0003 — п. 4 реализован (путь cookie, ротация, CSRF); задача-основа
`2026-10-22-universal-app-foundation` — статус «сделано F5a + F5b»; §12 — перечень отличий от рендера `v0.2.0`.

## 11. Implementation Context
Уровень — task3. Решения R1–R12 (§8.1). Слайсы — по одному коммиту, проверка после каждого обязательна.

### ENTRY POINTS
- S1: `uvx copier@9.19.1 update --defaults --vcs-ref v0.2.0 --skip-answered` в корне on-bike (чистое дерево;
  `_src_path` временно на локальную базу допустим — вернуть в S1).
- API: `POST /v1/auth/registration/poll` (+ `sessionTransport`), новые `POST /v1/auth/session/refresh`,
  `POST /v1/auth/session/sign-out`; `apps/api/src/main.ts` → `configureOnBikeHttp`.
- App: `src/app/_layout.tsx` (гарды), `features/auth/session-persistence(.web).ts`, `secure-storage.web.ts`.
- E2E: `apps/app/e2e/web.spec.ts`, `playwright.config.ts`, CI job `web`.

### Слайсы и проверка после каждого
| # | Что | Проверка |
|---|---|---|
| **S1** | `copier update` до `v0.2.0`; конфликты по U4; `.copier-answers.yml` (R1); U5: `lead?` в `ScreenPlaceholder`, `apiStatus.title`, вернуть `__tests__/query-wrapper.tsx`; `_layout.tsx` — импорт `online-manager` (гарды пока прежние); `pnpm install` (lockfile, пакеты 0.2.0); `e2e/web.spec.ts` — временно убрать шаг «Раздел» (полный смоук — S5) | `pnpm check`; `pnpm --filter @on-bike/app exec expo export -p android`; `pnpm build:web` проходит (SSR-пустота — известна, U7); `grep -rn '<<<<<<<\|>>>>>>>'` пусто; `git status` без `.rej` |
| **S2** | Удалить `apps/landing` и «до F5» (R12): `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.dependency-cruiser.cjs`, `eslint.config.mjs`, корневой `package.json`, `pnpm-workspace.yaml`, `ru.ts` (`landing.openInApp`), CI-комментарий, `infra/{Caddyfile,docker-compose.prod.yml}` (landing → web), rules `onbike-web.md`/`onbike-security.md` | `pnpm install`; `pnpm check`; `pnpm turbo run build`; `git grep -in 'astro\|landing' -- ':!docs/tasks' ':!docs/proposal-stack-architecture.md' ':!pnpm-lock.yaml'` — только ADR-0001/0003 и исторические места; diff корневых конфигов с рендером `v0.2.0` — пусто |
| **S3a** | Контракты + api-client (R5): `SessionTransport`, `CookieSession`, `RegistrationPollRequest.sessionTransport`, `RefreshSessionRequest/Response`, `SignOutRequest`; клиент: опция `credentials`, `refreshSession`, `signOut`, `pollRegistration` с транспортом | `pnpm --filter @on-bike/contracts test`, `--filter @on-bike/api-client test`, `pnpm typecheck` |
| **S3b** (параллельно S4) | Web-варианты app (R2, R10): гарды без блокировки SSR, `session-persistence(.web)`, `secure-storage.web`, `lib/api.ts` → `apiPlatformOptions` (`lib/api-platform(.web).ts`: web — `credentials: 'include'`, транспорт `cookie`), `generateMetadata` на `register` и `auth/verify/[token]`, отсчёт в `check-email` — после монтирования; спайк Stack.Protected на SSR — первым шагом | `pnpm --filter @on-bike/app test` (native + web + server); `pnpm build:web` + `start:web` + `curl -s 127.0.0.1:8080/register \| grep 'Регистрац'`, `/auth/verify/<43 символа>` — HTML не пустой, без e-mail; `expo export -p android` |
| **S4** (параллельно S3b) | API web-сессия (R4, R6–R9): `http-app.ts` (CORS credentials + CSRF), cookie в poll, `session/refresh`, `session/sign-out`, ротация в `SessionService`/репозитории, лимит refresh; первым шагом — проверка префикса `__Secure-` в Chrome на `http://127.0.0.1` (результат — §8.2) | `pnpm --filter @on-bike/api test` (unit + int на `on_bike_test`); `pnpm check`; Security checklist §8.3 — каждый пункт с тестом |
| **S5** | PWA/бренд/SSR on-bike + e2e (R3, R11): иконки из марки (§7), favicon, `app.json web.favicon`; `e2e/web.spec.ts` — смоук on-bike; `playwright.config.ts` — webServer API/worker при `E2E_API=1`; CI `web` — services + миграции + сборка API; замер веса JS | `pnpm build:web && pnpm e2e:web` с `pnpm infra:up` и `E2E_API=1` локально — зелёный; без API — сценарии регистрации `skip`, остальное зелёное; CI зелёный на PR; `Page.getInstallabilityErrors` пусто (кроме `in-incognito`) |
| **S6** | Документы (§10): AGENTS.md (§2, §3, §4.13, §8), README, ADR-0001 (пометка), ADR-0003 (п. 4 — реализация: путь cookie, CSRF Fetch Metadata), `docs/architecture/README.md`, runbook (web, cookie, dev на `127.0.0.1:8081`, `APP_LINK_BASE` для web, Safari), `onbike-app.md` (web-сессия, OG публичных экранов), задача-основа `2026-10-22-universal-app-foundation` — статус «сделано F5a+F5b», `design.md` (F5 сделан); §12 — перечень локальных отличий от рендера `v0.2.0` (обновить список F3b) | `pnpm check`; скриптовый `diff -rq` рендера `v0.2.0` с on-bike = перечень §12; ссылки в docs живые |

Параллель: после S3a — **исполнитель A: S4** (только `apps/api/**`), **исполнитель B: S3b** (только `apps/app/src/**`,
`apps/app/jest*`); общие файлы (`packages/**`, корень, lockfile, `ru.ts`) — не трогают: нужен ключ i18n — сообщить
оркестратору, он добавит после обоих. S1, S2, S3a, S5, S6 — последовательно, один исполнитель.

### Пофайловая таблица
| Файл | Слайс | Изменение |
|---|---|---|
| `.copier-answers.yml` | S1 | `_commit: v0.2.0`, `_src_path: gh:rkarakulov/app-foundation` |
| конфликтные файлы U4 (11) | S1 | по таблице U4 |
| `apps/app/src/components/screen-placeholder.tsx` | S1 | `lead?: MessageKey`; без него — `placeholder.soon` |
| `apps/app/src/__tests__/query-wrapper.tsx` | S1 | вернуть из шаблона |
| `packages/i18n/src/ru.ts` | S1, S2 | `apiStatus.title`, `status.*`; убрать `landing.openInApp`; новые ключи S3b/S5 (заголовки мета) |
| `apps/landing/**` | S2 | удалить (`git rm`) |
| `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.dependency-cruiser.cjs`, `eslint.config.mjs`, `package.json`, `pnpm-workspace.yaml` | S2 | вернуть к рендеру шаблона (без Astro); Playfair в каталоге — остаётся |
| `infra/Caddyfile`, `infra/docker-compose.prod.yml` | S2 | `landing` → `web` (`expo-server`, :8080), env web |
| `.claude/rules/onbike-web.md` | S2 | только admin, paths `apps/admin/**` |
| `.claude/rules/onbike-security.md` | S2 | paths: без landing; + `apps/app/src/features/auth/**`; правило web-сессии (cookie, access в памяти, CSRF) |
| `.github/workflows/ci.yml` | S2, S5 | комментарий build; job `web` — services, API/worker, `E2E_API=1`, секреты-заглушки |
| `packages/contracts/src/auth/session.schema.ts` | S3a | `SessionTransport`, `CookieSession`, `RefreshSessionRequest`, `RefreshSessionResponse`, `SignOutRequest`, `SESSION_COOKIE` (имя, path) |
| `packages/contracts/src/auth/registration.schema.ts` | S3a | `RegistrationPollRequest.sessionTransport?`; `verified.session: Session \| CookieSession` |
| `packages/contracts/src/auth/*.test.ts`, `index.ts` | S3a | тесты схем (старый native-запрос валиден; body-ответ — `Session`) |
| `packages/api-client/src/index.ts` (+ тест) | S3a | `credentials?: RequestCredentials` → `request(..., { credentials })`; `refreshSession(body?)`, `signOut(body?)` (204 → `z.undefined()`); `sessionTransport?` в опциях для poll |
| `apps/api/src/http-app.ts` (+ `http-app.test.ts`) | S4 | `configureOnBikeHttp(app, env)` (R9) |
| `apps/api/src/main.ts` | S4 | вызов `configureOnBikeHttp` вместо блока CORS шаблона |
| `apps/api/src/modules/identity/session.controller.ts` | S4 | `refresh`, `sign-out`: тонкий слой, `@Cookies`, `setCookie/clearCookie`, `no-store` |
| `apps/api/src/modules/identity/session-cookie.ts` | S4 | атрибуты cookie из `IDENTITY_POLICY` (один источник для set/clear) |
| `apps/api/src/modules/identity/{session.service,identity.repository,identity.policy,auth.controller,registration.service,identity.module}.ts` | S4 | `rotate`, `revoke`, лимит refresh; poll → cookie по транспорту |
| `apps/api/src/modules/identity/session.int.test.ts` | S4 | см. TESTS |
| `apps/app/src/app/_layout.tsx` | S3b | R2 |
| `apps/app/src/app/(tabs)/_layout.tsx` | S3b | скелетон при `unknown` |
| `apps/app/src/app/(onboarding)/{register,check-email}.tsx`, `auth/verify/[token].tsx` | S3b | `generateMetadata`; отсчёт после монтирования |
| `apps/app/src/features/auth/session-persistence.ts` / `.web.ts` | S3b | R10 |
| `apps/app/src/features/auth/secure-storage.web.ts` | S3b | `sessionStorage`, try/catch, SSR-безопасно |
| `apps/app/src/features/auth/{session-store,use-sign-in-when-verified}.ts` | S3b | через persistence; тип сессии в сторе — `CookieSession` (общая часть) |
| `apps/app/src/lib/api.ts`, `lib/api-platform.ts` / `.web.ts` | S3b | опции клиента по платформе |
| `apps/app/public/icons/*`, `assets/images/favicon.png` | S5 | марка on-bike |
| `apps/app/e2e/{web.spec.ts,urls.ts,mailpit.ts}`, `playwright.config.ts` | S5 | R11 |
| docs (§10) | S6 | — |

### TYPES & SCHEMAS (`packages/contracts/src/auth/session.schema.ts`)
```ts
export const SessionTransport = z.enum(['body', 'cookie']);           // по умолчанию body
export const CookieSession = Session.omit({ refreshToken: true });   // web: refresh — только в cookie
export const AnySession = z.union([Session, CookieSession]);         // Session первым: шире
export const RefreshSessionRequest = z.object({ refreshToken: OpaqueToken.optional() }); // нет → cookie
export const RefreshSessionResponse = AnySession;
export const SignOutRequest = RefreshSessionRequest;                  // ответ 204
export const SESSION_COOKIE = { name: '__Secure-onbike_rt', path: '/v1/auth/session' } as const;
```
`RegistrationPollRequest` += `sessionTransport: SessionTransport.optional()`. Коды ошибок — существующие
`UNAUTHORIZED` (401), `RATE_LIMITED` (429); отказ CSRF — `ForbiddenException` → фильтр api-kit отдаёт `FORBIDDEN`
(403) в конверте `ApiError` (проверить тестом `http-app.test.ts`).

### TESTS / CHECKS
- **contracts:** старый poll-запрос без `sessionTransport` валиден; `AnySession` парсит оба вида; `CookieSession`
  отбрасывает `refreshToken`.
- **api-client:** `credentials` уходит в `fetch`; `signOut` на 204 не падает; poll шлёт транспорт из опций.
- **API int (`on_bike_test`):** poll `cookie` → `Set-Cookie` с `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/session`,
  тело без `refreshToken`; poll без транспорта → прежний `Session`, без `Set-Cookie`; refresh по cookie → новая cookie,
  старая → 401; refresh по телу → новый `refreshToken`; истёкшая/отозванная/удалённый пользователь/мусор в cookie → 401
  и `clearCookie`; sign-out → 204, повтор → 204, refresh после — 401; лимит → 429; гонка двух refresh одним токеном —
  ровно один 200.
- **API unit:** `http-app.test.ts` (R9); `session-cookie` атрибуты.
- **App native (jest-expo/ios):** существующие тесты регистрации/гарда/verify зелёные без правок по смыслу; гард при
  `unknown` — скелетон, не редирект.
- **App web (`*.web.test.ts`):** `secure-storage.web` (sessionStorage, сбой → не бросает); `session-persistence.web`
  (restore → refresh с cookie; 401 → signedOut; сеть → signedOut без очистки cookie; Web Lock если есть);
  `api-platform.web` (`credentials: 'include'`, транспорт `cookie`).
- **E2E (S5):** R11 + шаги шаблона (`/status`, `/ui-kit`, PWA); `pageerror` и `console.error` — пусто.
- **Ручной смоук (человек):** мобильный Chrome/Safari по https (или `127.0.0.1` в Chrome) — регистрация → письмо →
  вход → перезагрузка; установка PWA. В pr.md — `NOT VERIFIED`, если не делался.

### FILES TO READ
F5a §8.1 (R1–R13, F1–F11); ADR-0003; `.claude/rules/{security,onbike-security,app,onbike-app,backend,contracts,tests}.md`;
`docs/tasks/2026-10-22-onboarding-01-signup/task.md` (сессия, poll, V-09); `node_modules/@nestjs/common/interfaces/http/
csrf-protection-options.interface.d.ts`, `@nestjs/core/adapters/http-adapter.d.ts` (`setCookie`); шаблон
`apps/app/{server,e2e,scripts}/**`.

### OUT OF SCOPE
Вход по паролю, сброс, reuse detection refresh, продление сессии, авто-refresh access по 401 (нет авторизованных
эндпоинтов) — слайс 2; native-клиент refresh/sign-out — слайс 2; universal/app links; og:image 1200×630 и экраны
объектов; Accept-Language на SSR; Docker-образ `on-bike-web` и деплой; нативная иконка (Q1); изменения в
app-foundation (только follow-ups в §12).

## 12. Outcome

### S1–S3a (coder, 2026-10-23)
Коммиты: S1 `34ed8c4`, S2 `fc32ecf`, S3a `28dbf46`.

**S1 — copier update.** `uvx copier@9.19.1 update --defaults --vcs-ref v0.2.0 --skip-answered` с `gh:` (git-доступ
через `gh auth git-credential` в env, `_src_path` не менялся): 11 конфликтов, `.rej` нет — как в пробе U1.
`.copier-answers.yml`: `_commit` `'@rkarakulov/api-client-core@0.2.0'` → `v0.2.0` руками (R1). Разбор:
- `AGENTS.md` §2 — строка app шаблона + «райдера», admin on-bike, без landing; §4.13 — текст шаблона + «(ADR-0003)»,
  «Переход» удалён;
- `docs/runbooks/local-dev.md` — оба: переменные identity + `CORS_ORIGINS`; «Ссылки из писем» + `APP_LINK_BASE` web
  (`http://127.0.0.1:8081/`); раздел «Web» шаблона, dev на `127.0.0.1:8081` (cookie `SameSite=Strict`);
- `apps/api/.env.example`, `config/env.ts` — оба (`Secret` + `corsOrigins`; identity + `CORS_ORIGINS`);
  `env.test.ts` — оба, `});` теста «секреты» восстановлен;
- `apps/app/package.json` — все зависимости, description шаблона + «райдера on-bike»; `_layout.tsx` — импорты сторов
  + `online-manager`; `app-routes.ts` — один комментарий; `pnpm-workspace.yaml` — оба;
- `ru.ts` — `status.*` + наш `admin.title`, возвращён `apiStatus.title`;
- `eslint.config.mjs` — шаблон, но `'**/.astro/**'` оставлен до S2 (иначе lint падал на `apps/landing/.astro`).
U5: `ScreenPlaceholder.lead?` (по умолчанию `placeholder.soon`), `__tests__/query-wrapper.tsx` из шаблона.
`e2e/web.spec.ts` — шаг «Раздел» убран (TODO S5). Пакеты `@rkarakulov/*` 0.2.0 в lockfile.

**S2 — удалено:** `apps/landing/**` (`git rm`, 9 файлов; неотслеживаемые `.astro/`, `dist/`, `node_modules/` перенесены
в scratchpad), `prettier-plugin-astro` (каталог, корень), `.astro` в `.gitignore`/`.prettierignore`/depcruise/eslint,
`landing` в `designSystemOnly`, `landing.openInApp`. Корневые `.prettierrc.json`, `.prettierignore`, `.gitignore`,
`.dependency-cruiser.cjs`, `eslint.config.mjs`, `package.json` = рендер `v0.2.0`; `pnpm-workspace.yaml` — плюс Playfair.
Infra: Caddy → `web:8080`, compose `landing` → `web` (`on-bike-web`, `HOST`, `PORT`, `EXPO_PUBLIC_API_URL`,
`API_INTERNAL_URL=http://api:3000`, `WEB_ORIGIN`). Rules: `onbike-web.md` — только admin; правила гостевых страниц
(экран на тип ссылки, SSR + OG без ПДн, публичное удаление аккаунта) → `onbike-app.md` «Публичные экраны по
ссылкам»; `onbike-security.md` — paths `apps/app/src/features/auth/**` вместо landing + правило web-сессии.

**S3a — контракты** (`packages/contracts/src/auth/session.schema.ts`, точные типы):
```ts
SessionTransport = z.enum(['body', 'cookie'])
CookieSession = Session.omit({ refreshToken: true })     // { accessToken, accessTokenExpiresAt, refreshTokenExpiresAt }
AnySession = z.union([Session, CookieSession])
RefreshSessionRequest = z.object({ refreshToken: OpaqueToken.optional() })   // {} → cookie
RefreshSessionResponse = AnySession
SignOutRequest = RefreshSessionRequest                    // ответ 204 без тела
SESSION_COOKIE = { name: '__Secure-onbike_rt', path: '/v1/auth/session' } as const
RegistrationPollRequest = { registrationToken, sessionTransport?: SessionTransport }
RegistrationPollResponse = pending | { state: 'verified', session: AnySession }
```
api-client: `ApiClientOptions` += `credentials?: RequestCredentials` (в каждый запрос, GET и POST; не задан — поля
нет), `sessionTransport?: SessionTransport` (подмешивается в тело poll); `refreshSession(body = {})` →
`POST /v1/auth/session/refresh` (`RefreshSessionResponse`); `signOut(body = {})` → `POST /v1/auth/session/sign-out`
(`z.undefined()`: ждёт пустое тело). Потребители: `poll.int.test.ts` — `Session.parse(body.session)` (ответ без
транспорта — полный Session); `use-sign-in-when-verified.ts` — `Session.safeParse` (native body), TODO S3b.

**Проверки** (после каждого слайса, хвосты):
- S1: `pnpm check` — EXIT 0 (prettier ok; turbo typecheck 9/9; тесты: api 66, app 98 (native+web+server, 21 suite),
  contracts 21, api-client 11, design-tokens 114, admin 7, i18n 5, tracks 2); `expo export -p android` — `Exported`
  (hbc 4.1 MB); `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 pnpm build:web` — `Exported: dist`, `sw.js: 35 файлов`
  (без переменной сборка падает «EXPO_PUBLIC_API_URL не задан для сборки» — поведение шаблона); маркеры
  `<<<<<<<`/`>>>>>>>` — пусто; `.rej` — нет.
- S2: `pnpm install`; `pnpm check` — EXIT 0 (depcruise 190 модулей, 0 нарушений); `pnpm turbo run build` — 7/7;
  `git grep -in 'astro\|landing'` (исключения §11) — только ADR-0001/0003; diff корневых конфигов с рендером — пусто
  (кроме Playfair в `pnpm-workspace.yaml`).
- S3a: TDD — тесты падали (10 contracts, 6 api-client), затем зелёные: contracts 32, api-client 19; `pnpm check` —
  EXIT 0 (typecheck 8/8, api 66, app 98).
- Флейк окружения: первый `pnpm test` после смены lockfile — `ENOTEMPTY rmdir node_modules/.vitest-cache` (гонка
  пакетов vitest за общий кеш), повтор зелёный. PostgreSQL dev был остановлен (Docker Desktop выключен) —
  запущены Docker Desktop и контейнеры `on-bike-dev-postgres-1`, `on-bike-dev-mailpit-1`; Redis — локальный на :6379.

**NOT VERIFIED:** `pnpm e2e:web` (S5: `/` SSR пустой — U7, `/ui-kit` в production → гард); CI на PR — job `web`
будет красным до S3b/S5; `actionlint` не установлен.

**Отклонения (для §8.2):** (1) `'**/.astro/**'` в eslint удалён в S2, а не в S1; (2) в S2 сверх таблицы — точечно
убран landing из AGENTS.md §3/§8, README, CLAUDE.md, `docs/architecture/README.md`, runbook (чтобы grep S2 был
чистым; полное обновление docs — S6), правила гостевых страниц перенесены в `onbike-app.md`; (3) в S3a — правки в
зонах S3b/S4 только для typecheck (`use-sign-in-when-verified.ts`, `poll.int.test.ts`); (4) `credentials` клиента —
на всех запросах, не только сессии (cookie всё равно ограничена `Path`).

**Исполнителю S3b (app):** web-клиент — `createApiClient({ baseUrl, credentials: 'include', sessionTransport:
'cookie' })`; ответ poll/refresh на web — `CookieSession` (стор — общая часть); убрать TODO и `safeParse` в
`use-sign-in-when-verified.ts`; `refreshSession()` без аргументов — по cookie, `signOut()` резолвится `undefined`;
`_layout.tsx` — гарды прежние, `if (!ready) return null` (U7 — твоя задача, R2); `ScreenPlaceholder` уже с `lead?`;
`build:web` локально — с `EXPO_PUBLIC_API_URL`.

**Исполнителю S4 (api):** `main.ts` сейчас с блоком CORS шаблона (`credentials: false`) — заменить на
`configureOnBikeHttp`; JSDoc `corsOrigins` в `config/env.ts` говорит «cookie и credentials не разрешаются» — поправить
(R8); для `cookie` отвечать без `refreshToken` (`CookieSession`), для тела/без транспорта — прежний `Session`;
sign-out — строго 204 без тела (клиент парсит `z.undefined()`); имя и путь cookie — `SESSION_COOKIE` из contracts:
если `__Secure-` не примется на `http://127.0.0.1` — сообщить оркестратору (правка в `packages/**` — не в зоне S4);
`APP_LINK_BASE` уже принимает `http://127.0.0.1:8081/`.

**Не трогал:** незакоммиченное изменение `.claude/settings.json` (deny → ask для `rm -rf`/DROP, без `gh pr merge`)
и `.idea/` в рабочем дереве — появились не от coder, не в коммитах.

### Локальные отличия от рендера `v0.2.0` (скриптовый сравнитель: `copier copy --vcs-ref v0.2.0` в scratchpad,
`git ls-files` vs рендер, после S3a)
**Корень и CI:** `.copier-answers.yml` (`_src_path: gh:…`), `.github/workflows/ci.yml` (`pnpm turbo run build` — все
приложения), `pnpm-workspace.yaml` (Playfair), `README.md`, `AGENTS.md`, `CLAUDE.md`. «До F5» (Astro) — **нет**.
**API:** `.env.example`, `package.json`, `app.module.ts`, `worker.module.ts`, `queues.ts`, `config/env{,.test}.ts`,
`error-messages{,.test}.ts`, `test/{test-env.ts,harness.int.test.ts}`, `drizzle/meta/{0000_snapshot,_journal}.json`;
вне шаблона — `modules/{identity,tracks}`, миграции on-bike и пр. (O, как F3b).
**App:** `package.json`, `app.json`, `jest.config.js` (TZ), `jest.setup.ts`, `e2e/web.spec.ts` (временно, S5),
`src/app/{_layout,(tabs)/_layout,(tabs)/index}.tsx`, `src/components/screen-placeholder.tsx` (`lead?`),
`src/__tests__/{app-routes.ts,root-layout.test.tsx,tabs.test.tsx}`, `src/theme/{design-system,fonts,fonts.test}.ts`;
O — как F3b.
**Admin:** `index.html`, `package.json`, `public/favicon.svg`, `src/App.test.tsx`, `src/fonts.ts`.
**Пакеты:** `api-client/src/{index,index.test}.ts`, `contracts/src/{common,common.test,index}.ts`,
`design-tokens/src/{brand,contrast,index,design-tokens.test}.ts`, `i18n/src/{ru,index.test}.ts`; O — `auth/**`,
`tracks/**`, тесты продукта.
**Docs:** `docs/README.md`, `docs/runbooks/local-dev.md`; O — adr, architecture, product.
**Удалённые файлы шаблона (N):** `docs/adr/0001-stack.md`, `apps/api/drizzle/0000_init.sql`,
`apps/app/src/app/(tabs)/section.tsx`, `apps/app/src/__tests__/section.test.tsx`,
`apps/app/assets/images/splash-icon.png`; `__tests__/query-wrapper.tsx` — **возвращён** (R3). Правила, `.ai/dev-kit`,
`.agents`, `.codex`, `.claude/settings.json` (в git) = рендер.

**Follow-ups в app-foundation:** `_commit` после `copier update` — снова тег пакета, а не `v0.2.0` (повтор F3b S5(б));
runbook шаблона создаёт `apps/app/.env` после `pnpm build:web`, а сборка без `EXPO_PUBLIC_API_URL` уже падает —
поменять порядок шагов.

### S4 — API web-сессия (coder A, 2026-10-23)
**Эндпоинты** (`modules/identity`):
- `POST /v1/auth/registration/poll` — `sessionTransport: 'cookie'` → `Set-Cookie` + тело `CookieSession`;
  без поля / `body` → прежний `Session`, без cookie (`AuthController` → `SessionCookie.deliver`).
- `POST /v1/auth/session/refresh` (`SessionController`) — `refreshToken` в теле → ротация, ответ `Session`; иначе
  refresh из cookie (`@Cookies(SESSION_COOKIE.name)`, `OpaqueToken.safeParse` до лимита и БД) → новая cookie +
  `CookieSession`. 401 по cookie → `clearCookie`; 429 cookie не трогает.
- `POST /v1/auth/session/sign-out` — 204 без тела всегда (тело или cookie; мусор/неизвестный/повтор — тоже 204);
  по cookie — `clearCookie`.
- `Cache-Control: no-store` — на 200/204/401 сессии (ставится до работы обработчика).

**Cookie** (`session-cookie.ts`, один набор атрибутов для set/clear): `__Secure-onbike_rt=<refresh>; Max-Age=<остаток
срока сессии, с>; Path=/v1/auth/session; HttpOnly; Secure; SameSite=Strict`, без `Domain`; имя и путь — `SESSION_COOKIE`.
Запись — `HttpAdapterHost.httpAdapter.setCookie/clearCookie/setHeader` (NestJS 12.2, без пакетов, без подписи).

**Ротация** (`SessionService.rotate` → `IdentityRepository.rotateSession`): один условный `UPDATE sessions SET
refresh_token_hash = new WHERE hash = old AND revoked_at IS NULL AND expires_at > now AND пользователь не удалён
RETURNING` — sid и `expires_at` прежние (срок не продлевается), гонка — ровно один 200. Access не живёт дольше
сессии (`min(now + 15 мин, expires_at)`). Отзыв — `revokeSession` (`revoked_at`, идемпотентно). Лимит refresh —
`IDENTITY_POLICY.refreshPerIpLimit` 60/мин по HMAC IP (`RateLimiter`), 429 + `retryAfterSec`.

**HTTP** (`http-app.ts`, `main.ts`): `configureOnBikeHttp(app, env)` = `configureHttpApp` (`/v1`) + `enableCors({ origin:
CORS_ORIGINS, credentials: true })` при непустом списке + `enableCsrfProtection({ trustedOrigins: CORS_ORIGINS })`
глобально. JSDoc `CORS_ORIGINS` в `config/env.ts` — по R8.

**Тесты (Security checklist §8.3):**
- п. 1 AuthN/AuthZ — `session.int.test.ts`: refresh по cookie/телу, старый токен → 401, отозванная/истёкшая/удалённый
  пользователь → 401, гонка 5 refresh → `[200, 401×4]`, sign-out → refresh 401; атрибуты cookie poll/refresh;
  `http-app.test.ts`: cross-site и form-POST → 403 `FORBIDDEN` (`ApiError`), same-site с недоверенного порта → 403,
  старый браузер (Origin ≠ Host) → 403, same-origin / native без заголовков / trusted dev-origin → 200, в проде
  dev-origin → 403, GET cross-site → 200; preflight CORS: `Allow-Origin` + `Allow-Credentials` для списка, чужому
  origin — без `Allow-Origin`, пустой список — без CORS.
- п. 2 Входные данные — `sessionTransport` вне enum → 400; `refreshToken` в теле не по схеме → 400;
  `session.controller.test.ts`: нет cookie / мусор / 42 символа → 401 и сброс без вызова сервиса (ни лимита, ни БД).
- п. 3 Данные наружу — тело web без `refreshToken` (poll и refresh, точный набор ключей); sign-out — 204 без тела;
  `no-store`; `session-cookie.test.ts` — точные атрибуты set/clear, без `Domain`.
- п. 4 Злоупотребления — 60 refresh → 61-й 429 с `retryAfterSec`, без сброса cookie; шесть причин 401 — один и тот
  же ответ (без оракула).
- п. 5 Секреты — в БД после ротации только `sha256(новый refresh)`; токены не логируются (контроллер/сервис не пишут
  логов, фильтр api-kit не логирует тела).
- п. 6 Аудит — `revoked_at` при выходе, смена хеша при ротации (тесты выше).
- Мутационная проверка: без условия «пользователь не удалён» в `rotateSession` int-тест падает.

**Проверки:** `pnpm --filter @on-bike/api typecheck` — EXIT 0; `pnpm exec eslint apps/api` — EXIT 0 (скрипта `lint`
у пакета нет — линт из корня); `prettier --check apps/api` — ok; `pnpm arch:check` — 0 нарушений (212 модулей);
`pnpm --filter @on-bike/api test` — 20 файлов, 99 тестов (было 66). Полный `pnpm check` — оркестратор после S3b.

**Отклонения:** (1) `@fastify/cors` шлёт `Access-Control-Allow-Credentials: true` и чужому origin (без
`Allow-Origin` — браузер ответ не отдаёт); тест проверяет отсутствие `Allow-Origin`. (2) Атрибуты cookie — константа
в `session-cookie.ts`, из `IDENTITY_POLICY` — только срок (`Max-Age` = остаток `refreshTokenTtlMs`) и лимит refresh.
(3) Access ограничен сроком сессии (`min`) — сверх таблицы, чтобы access не переживал сессию после ротации в конце срока.
(4) Конструктор `SessionService` += `RateLimiter` (unit-тест обновлён аргументом).

**Для S3b:** web — `pollRegistration` с `sessionTransport: 'cookie'`, `refreshSession()`/`signOut()` с `{}` и
`credentials: 'include'`; 401 refresh приходит с `clearCookie` — signedOut; 429 — не выход (повтор позже).
Dev web — `http://127.0.0.1:8081` (в `CORS_ORIGINS` `.env.example` уже есть). **Для S5:** e2e — `CORS_ORIGINS` API
должен содержать origin web-сервера смоука (`http://127.0.0.1:8090`/`8091` — в `.env.example` есть; в CI задать явно),
иначе POST с web — 403 CSRF; Playwright — `channel: 'chrome'` (Chromium нужной ревизии `__Secure-` не проверялся).
**Follow-ups в app-foundation:** хук `configureApp` в `createApiHarness` (int-тесты identity идут без CSRF/CORS — CSRF
проверен unit-тестом `http-app.test.ts`); опция `credentials` CORS в шаблоне — когда сессия появится в базе.
**Слайс 2:** reuse detection refresh, продление сессии, native-клиент refresh/sign-out.

### S3b — web-варианты приложения (coder B, 2026-10-23)
**Спайк Stack.Protected на SSR** (expo-router 58.0.24, по исходникам `build/layouts/withLayoutContext.js`,
`build/useScreens.js` и сборке): `guard` — обычный проп, вычисляется в рендере и на сервере; экран, не прошедший
гард, рендерит `<Redirect>` — он срабатывает в `useFocusEffect`, на сервере это `null`. Значит, гарды, допускающие
`unknown`, дают SSR контент, план Б не нужен. Проверка — `build:web` + `start:web` + curl с гардами R2:
`/register` — форма, `/status` — как шаблон, `/auth/verify/<43>` — кикер + скелетон, `/` — скелетон.

**Сделано (R2, R10):**
- `_layout.tsx` — корень ждёт только шрифты; splash скрывается, когда шрифты + сессия + регистрация известны;
  гарды `(tabs)`: `unknown || signedIn`, `(onboarding)`: `!signedIn` (срок refresh проверяется, как раньше).
  `(tabs)/_layout` при `unknown` — `ShellSkeleton` (`components/shell-skeleton.tsx`, раскладка `ScreenPlaceholder`).
- `check-email` — до гидрации регистрации скелетон (заголовок виден), без редиректа: адрес и отсчёт (`Date.now()`)
  рендерятся только на клиенте, SSR их не видит (R13 F5a) — `useSecondsLeft` не менялся.
- Хранилище: `secure-storage.web.ts` — `sessionStorage`, try/catch, SSR-безопасно (нет хранилища → `null`/no-op,
  сбой записи — `console.warn` с именем ошибки); общий `readJson` вынесен в `read-json.ts`.
- Сессия: `session-persistence.ts` (native: SecureStore, как было; без `refreshToken` — не сохраняет) /
  `.web.ts` (`restoreSession` = `api.refreshSession()` без тела под `navigator.locks` `onbike.session-refresh`,
  ответ — `CookieSession.parse` (refresh в память не попадает); 401/сеть → `undefined`, cookie не трогаем;
  `persistSession` — no-op; `clearSession` = `api.signOut()`, сбой — warn). `session-expiry.ts` — `isSessionAlive`.
  Стор: `session: CookieSession | null`, `signIn(AnySession)`, гидрация не затирает вход, случившийся во время неё.
  `use-sign-in-when-verified.ts` — без `Session.safeParse` и TODO.
- Клиент: `lib/api-platform.ts` (`{}`) / `.web.ts` (`credentials: 'include'`, `sessionTransport: 'cookie'`) →
  `lib/api.ts`.
- Мета: `lib/page-metadata.ts` (`publicPageMetadata`: title, description, OG; `og:url` только из `WEB_ORIGIN` и только
  при переданном `path`); `register` — «Регистрация — on-bike», `og:url` `/register`; `auth/verify/[token]` —
  «Подтвердите e-mail — on-bike», без `og:url`, без `loader`; оба — `DocumentTitle`. Ключи — существующие
  (`auth.kicker`, `auth.verify.title`, `app.tagline`), `packages/i18n` не менялся.

**Тесты:** native — гард при `unknown`: скелетон, без редиректа (`/`), регистрация открывается сразу (`/register`);
`check-email` до гидрации — скелетон без отсчёта; без регистрации — к «Создать аккаунт»; `root-layout` — скелетон
вместо Главной; `public-metadata.test.ts`; `api-platform.test.ts`. Web — `secure-storage.web`, `session-persistence.web`
(refresh без тела, `refreshToken` отброшен, 401, сеть без sign-out, Web Lock, гонка с входом, хранилища пусты,
sign-out), `use-sign-in-when-verified.web` (вход по `CookieSession`), `api-platform.web`. `tabs`/`ui-kit` —
`signInForTest()` (вкладки рендерят контент только при известной сессии).

**Проверки:** TDD — 9 падающих наборов до реализации; `pnpm --filter @on-bike/app typecheck` — exit 0; `eslint
apps/app --max-warnings=0` — 0 (в app нет скрипта `lint`, корневой `pnpm lint` = eslint); prettier — ok; depcruise
apps/app — 0 нарушений; `pnpm --filter @on-bike/app test` — 27 наборов, 120 тестов (native + web + server);
`EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 build:web` — `Exported: dist`; `start:web` (`WEB_ORIGIN` задан) + curl:
`/register` — `<title>Регистрация — on-bike</title>`, OG, форма; `/auth/verify/<43>` — 200, title/OG, кикер + скелетон,
ни e-mail, ни токена в HTML; `/check-email` — скелетон; `/` — скелетон; Chrome (Playwright, API замокан `page.route`):
`/` → `/register` после 401 refresh, ошибок гидрации и `pageerror` нет, `sessionStorage`/`localStorage` пусты;
`expo export -p android` — `Exported: dist` (перезаписывает web `dist` — перед e2e пересобрать).

**Исполнителю S5:** (1) аноним на каждой загрузке шлёт `POST /v1/auth/session/refresh` → 401, Chrome пишет
«Failed to load resource: 401» как `console.error` — фильтр в смоуке (или решение по API: 204 без cookie — вне S3b);
(2) `/check-email` при SSR содержит и форму регистрации (начальный экран стека `(onboarding)`) — ожидаемо;
(3) `dist` после `expo export -p android` — Android, перед `e2e:web` — `build:web`.

### S5 — PWA, бренд, e2e, CI (coder, 2026-10-23)
**PWA и бренд (R3, §7).** Иконки — из марки `splash-route-light.png` (маршрут + точка старта) на
`themes.light.surface.default` (#FFFFFF), одноразовым скриптом CoreGraphics (Swift, вне репозитория; `sips` не
умеет наложение на фон): `icon-192`/`icon-512`/`apple-touch-icon` (180) — рамка марки 80 % ширины; `icon-maskable-512` —
диагональ рамки 64 % стороны (= 80 % круга safe zone 80 %); `assets/images/favicon.png` (48², `app.json web.favicon`
уже указывал на него) — 90 %. Manifest-маршрут и `+html.tsx` шаблона не менялись: имя и цвета — из словаря и темы
on-bike. `/status` — экран шаблона (R3).

**E2E (R11)** — `apps/app/e2e/{web.spec.ts,urls.ts,mailpit.ts}`, `playwright.config.ts`:
- всегда: `/` — SSR-скелетон оболочки, после гидрации аноним → `/register`; `/register` — форма, `<title>`, OG,
  `og:url` из `WEB_ORIGIN`; `/auth/verify/<43>` — SSR 200, title/OG, без `og:url`, токена нет в `<meta>`; `/status` —
  как шаблон; `/ui-kit` production → `/register` (аноним), dev — витрина; PWA — manifest без ошибок, имя `on-bike`,
  `theme_color` бренда, `Page.getInstallabilityErrors` пусто (кроме `in-incognito`), SW активен;
- `E2E_API=1`: `playwright.config.ts` поднимает API (`node dist/main.js`, ждёт `/v1/health`) и worker из `apps/api`
  с `APP_LINK_BASE=<web смоука>/`, `CORS_ORIGINS=<web>,<web dev>`, `PORT` из `EXPO_PUBLIC_API_URL`; остальное — `.env`
  API локально или env CI. Сценарий: `/` → `/register` → форма → «Подтвердите e-mail» → письмо из Mailpit API
  (`/api/v1/search`, `/api/v1/message/{ID}`), ссылка = `${BASE_URL}/auth/verify/<43>` → во второй вкладке
  «Подтвердить e-mail» → «E-mail подтверждён»; первая вкладка: ответ poll `verified` — ключи сессии ровно
  `accessToken, accessTokenExpiresAt, refreshTokenExpiresAt` → «Главная»; cookie `__Secure-onbike_rt` — `HttpOnly`,
  `Secure`, `SameSite=Strict`, `Path=/v1/auth/session`, `document.cookie` без неё; перезагрузка → refresh 200 →
  «Главная». Без `E2E_API` — `test.skip` с причиной.
- `pageerror` и `console.error` — пусто, кроме 401 refresh (и отказа соединения с API без API) — §8.2.

**CI** (`.github/workflows/ci.yml`, job `web`): services `postgres` (postgis 18-3.6), `redis` 8.8, `mailpit`
(`axllent/mailpit:v1.31@sha256:23fe39e8…0387` — digest индекса мультиарх, проверен в registry); env — `E2E_API=1`,
адреса и фиктивные секреты (как `test-env.ts`, gitleaks — no leaks); шаги: `pnpm turbo run build
--filter=@on-bike/api` → `db:migrate` → `pnpm build:web` → `pnpm --filter @on-bike/app e2e:web`. Окружение CI
проверено запуском `apps/api/dist/main.js` только с ним (`env -i`, без `.env`) — `/v1/health` 200.

**Вес JS** (production `dist`, `gzip -9`, скрипты из SSR-HTML маршрута): `/` 6 скриптов, 1862 КБ raw / **441 КБ gzip**;
`/register` 1914 / **458**; `/auth/verify/<токен>` 1863 / **441**; `/status` 1859 / **440**; весь JS сборки — 468 КБ
gzip. Шаблон F5a — ~430 КБ: on-bike +~10 КБ на общем ядре, форма регистрации (react-hook-form, zod-резолвер) —
+17 КБ чанком `register`.

**Проверки:**
- `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 pnpm build:web` — `Exported: dist`, `sw.js: 35 файлов статики`.
- Без API: `playwright test` — `7 passed, 1 skipped` (сценарий с API — skip).
- С API: `E2E_API=1 EXPO_PUBLIC_API_URL=… pnpm e2e:web` (turbo: `build:web` → e2e) — первый прогон 7/8: шаг verify с
  неизвестным токеном ловил 404 API в консоли → шаг сделан SSR-only (§8.2); повтор — `8 passed (19.5s)`, регистрация
  с письмом — 5.5 с. Перед этим `pnpm turbo run build --filter=@on-bike/api`, `db:migrate` (dev-БД, применено).
- `pnpm check` — EXIT 0 (depcruise 217 модулей, 0 нарушений; app 27 наборов / 120 тестов; api 99; contracts 32;
  api-client 19; design-tokens 114; admin 7; i18n 5; tracks 2).

**NOT VERIFIED:** CI job `web` на PR (проверит оркестратор после push); `actionlint` не установлен (YAML разобран
`yaml`, структура job проверена); установка PWA руками и мобильные браузеры — ручной смоук человека.

### S6 — документы и итоговые отличия от `v0.2.0` (coder, 2026-10-23)
**Документы (§10):** `AGENTS.md` §3 (`e2e:web` с `E2E_API=1`; §2, §4.13, §8 — сделаны в S1/S2); `README.md` (быстрый
старт шаблона: токен пакетов, Mailpit, web-строки, `127.0.0.1`, `e2e:web`; разделы on-bike — шаблон, EAS);
ADR-0001 — статус «частично заменён ADR-0003» (+ реестр `docs/adr/README.md`); ADR-0003 — раздел «Реализация»
(п. 1–2 SSR/OG/PWA и вес JS, п. 4 cookie/ротация/CSRF Fetch Metadata, п. 5–7, CI); `docs/architecture/README.md` —
«Сессия: native и web», «Web (SSR, PWA)»; runbook — сессия web (cookie, 401 анонима в консоли, `sessionStorage`,
Safari по http), `APP_LINK_BASE` web, смоук с API, CI `web`, прод Caddy → `web:8080`, ручная регистрация в браузере;
`.claude/rules/onbike-app.md` — мета публичных экранов (`publicPageMetadata`, без ПДн, без `og:url` у пути с
токеном) и «Сессия в вебе» (клиент); `onbike-security.md` — правило web-сессии уже из S2; задача-основа
`2026-10-22-universal-app-foundation` — «сделано F5a + F5b» (+ отличия от плана); `design.md` — F5 сделан.

**Итоговые локальные отличия от рендера `v0.2.0`** (скрипт: `find` рендера `copier copy --vcs-ref v0.2.0` vs
`git ls-files` + `cmp`; `.claude/settings.json` — по HEAD: незакоммиченная правка человека не в счёт). Итого:
изменено 63 файла шаблона, удалено 5, только в on-bike — 168 (из них `docs/tasks/**`, модули API, контракты auth,
`packages/tracks`, миграции — продукт on-bike, O).
- **Корень и CI (M):** `.copier-answers.yml` (`_src_path: gh:…`), `.github/workflows/ci.yml` (`pnpm turbo run build` —
  все приложения; job `web` — services, сборка API, миграции, `E2E_API=1`, Playwright напрямую), `turbo.json`
  (`E2E_API`, `MAILPIT_URL` в `passThroughEnv` `e2e:web`), `pnpm-workspace.yaml` (Playfair), `README.md`, `AGENTS.md`,
  `CLAUDE.md`. «До F5» (Astro) — **нет**.
- **API (M):** `.env.example`, `package.json`, `main.ts` (`configureOnBikeHttp`), `app.module.ts`, `worker.module.ts`,
  `queues.ts`, `config/env{,.test}.ts`, `error-messages{,.test}.ts`, `test/{test-env.ts,harness.int.test.ts}`,
  `drizzle/meta/{0000_snapshot,_journal}.json`. O: `http-app{,.test}.ts`, `trust-proxy.int.test.ts`, `test/identity.ts`,
  `modules/{identity,tracks}/**`, миграции 0001–0003.
- **App (M):** `package.json`, `app.json`, `jest.config.js` (TZ), `jest.setup.ts`, `e2e/{web.spec,urls}.ts` и
  `playwright.config.ts` (смоук on-bike, API/worker при `E2E_API=1`), `public/icons/*` и `assets/images/favicon.png`
  (марка on-bike), `src/app/{_layout,(tabs)/_layout,(tabs)/index}.tsx`, `src/components/screen-placeholder.tsx`
  (`lead?`), `src/lib/api.ts` (`apiPlatformOptions`), `src/theme/{design-system,fonts,fonts.test}.ts`,
  `src/__tests__/{app-routes.ts,root-layout.test.tsx,tabs.test.tsx,ui-kit.test.tsx}`. O: `(onboarding)/**`,
  `auth/verify/[token].tsx`, вкладки on-bike, `features/auth/**` (в т. ч. `.web`-варианты), `lib/{api-platform(.web),
  page-metadata,countdown}.ts`, `components/shell-skeleton.tsx`, `e2e/mailpit.ts`, марка `splash-route-*.png`, ассеты
  create-expo-app (`expo-*`, `react-logo*`, `tabIcons`, `expo.icon`, `.vscode`).
- **Admin (M):** `index.html`, `package.json`, `public/favicon.svg`, `src/App.test.tsx`, `src/fonts.ts`.
- **Пакеты (M):** `api-client/src/{index,index.test}.ts`, `contracts/src/{common,common.test,index}.ts`,
  `design-tokens/src/{brand,contrast,index,design-tokens.test}.ts`, `i18n/src/{ru,index.test}.ts`. O: `contracts/src/auth/**`,
  `api-client/src/{auth,session}.test.ts`, `packages/tracks/**`.
- **Docs (M):** `docs/README.md`, `docs/runbooks/local-dev.md`. O: `adr/**` (своя нумерация, `0001-stack-and-monorepo`),
  `architecture/`, `product/`, `proposal-stack-architecture.md`, `runbooks/README.md`, `tasks/**`.
- **Infra (O):** `infra/{Caddyfile,docker-compose.prod.yml,.env.example}` (прод: `web:8080` вместо landing).
- **Rules (O):** `.claude/rules/onbike-*.md` (7). Правила шаблона, `.ai/dev-kit`, `.agents`, `.codex`,
  `.claude/settings.json` (HEAD) = рендер.
- **Удалённые файлы шаблона (N, 5):** `docs/adr/0001-stack.md`, `apps/api/drizzle/0000_init.sql`,
  `apps/app/src/app/(tabs)/section.tsx`, `apps/app/src/__tests__/section.test.tsx`, `apps/app/assets/images/splash-icon.png`.
- **Изменения против списка S1–S3a:** + `turbo.json`, `apps/api/src/main.ts`, `apps/app/src/lib/api.ts`,
  `src/__tests__/ui-kit.test.tsx`, иконки PWA и favicon, `playwright.config.ts`; `e2e/web.spec.ts` — уже не
  «временно», а смоук on-bike.

**Проверки S6:** ссылки — скрипт по всем `*.md` в git (кроме `.ai/.agents/.codex`): относительные ссылки
`[..](путь)` — 0 битых; пути в бэктиках новых разделов проверены `test -e`; `git grep -in 'astro\|landing'`
(исключения §11) — только ADR-0001/0003; `pnpm check` — EXIT 0 (typecheck 8/8, test 13/13: app 27 наборов /
120 тестов, api 99).

**Follow-ups в app-foundation (итог F5b):**
1. `_commit` после `copier update` — тег пакета (`@rkarakulov/api-client-core@0.2.0`), а не `v0.2.0` (повтор F3b S5(б)).
2. Runbook шаблона: `apps/app/.env` создаётся после `pnpm build:web`, а сборка без `EXPO_PUBLIC_API_URL` падает —
   поменять порядок.
3. `createApiHarness` (test-kit): хук `configureApp` до `app.init()` — int-тесты с CSRF/CORS проекта.
4. CORS `credentials` в шаблоне — когда сессия (identity) появится в базе (F6).
5. Смоук шаблона: фильтр `console.error` `Failed to load resource|net::ERR_` пропускает любой HTTP-отказ — сузить
   (как on-bike: конкретный URL и статус) и дать точку расширения `webServer` (API/worker при `E2E_API`) и
   `passThroughEnv`, чтобы проекты с API не расходились с шаблоном в `playwright.config.ts`, `turbo.json`, CI.
6. Иконки PWA шаблона — дефолтные Expo: скрипт генерации из марки бренда (maskable safe zone) как часть шаблона.
