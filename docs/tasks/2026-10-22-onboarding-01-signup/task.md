# 1. Title

Онбординг · слайс 1 — регистрация и подтверждение e-mail

# 2. Goal

Райдер создаёт аккаунт по e-mail, подтверждает адрес кнопкой по ссылке из письма и входит без повторного ввода
пароля (V-09). Источник — прототип `key-onboarding` (кадры Sign up, Under 18, Deleted e-mail, Confirm email,
Resend, Link opened, Verified, Link expired). Слайсы 2–5 (вход, сброс пароля, опрос и геопозиция, веб-страницы
ссылок) — отдельные задачи.

Решения человека (2026-10-22): Q1 — токен регистрации; Q2 — Mailpit + SMTP; Q3 — база ссылок в конфиге
(dev `onbike://`); Q4 — значения прототипа (24 ч, 60 с, 10 писем/сутки, 15 мин, 7 дней, пароль ≥ 8).

# 3. Scope

**API — модуль `identity`**
- Таблицы: `users` (email нормализован, `password_hash` argon2id, `birth_date`, `personal_data_consent_at`,
  `agreement_version` + `agreement_accepted_at`, `email_verified_at`, `deleted_at`), `email_verification_tokens`,
  `registration_tokens`, `sessions`. Миграция Drizzle (expand-only).
- `POST /v1/auth/register` → аккаунт не активен, письмо подтверждения, `registrationToken` (24 ч).
  Отказы: младше 18 и без согласия — валидация контракта; e-mail занят — `EMAIL_TAKEN`; e-mail удалённого
  аккаунта — нейтральный `EMAIL_UNAVAILABLE` (D-07).
- `GET /v1/auth/verification/:token` — без побочных эффектов: `{ email, state: valid | verified | expired }`.
- `POST /v1/auth/verification/confirm` — активация только POST (C2); идемпотентно для уже подтверждённого.
- `POST /v1/auth/verification/resend` — по `registrationToken` или по устаревшей ссылке; пауза 60 с, ≤ 10/сутки
  (Redis); новая ссылка отменяет прежние.
- `POST /v1/auth/registration/poll` — по `registrationToken`: `pending` | `verified` + сессия (одноразовый обмен).
- Сессия: access JWT (15 мин) + refresh (30 дней, в БД хешем). Ротация refresh и вход по паролю — слайс 2.
- Письма — через outbox → BullMQ → `Mailer` (SMTP; dev — Mailpit). Шаблон «Подтвердите e-mail» (HTML + text).
- Ежедневная задача: удаление неподтверждённых аккаунтов старше 7 дней (V-10).
- Ошибки API — единый формат `ApiError` из contracts (глобальный фильтр).

**Contracts / api-client** — схемы запросов/ответов, коды ошибок, методы клиента.

**Mobile**
- Экраны: «Создать аккаунт», «Подтвердите e-mail» (повтор с отсчётом, polling подтверждения, восстановление
  после перезапуска, пока жив токен), «Подтвердить e-mail» по ссылке `onbike://auth/verify/<token>`,
  «Ссылка устарела», «E-mail подтверждён».
- Сессия — `expo-secure-store` + маленький zustand-стор; гард: без сессии — стек регистрации.
- QueryClient с `onlineManager` + NetInfo (правило mobile.md).
- Дизайн-система: новый компонент `DateField` (нативный пикер) — в `components/ui` с тестом и примером на `/ui-kit`.

**Infra** — Mailpit в `docker-compose.dev.yml`; тестовая БД `onbike_test` для интеграционных тестов; сервисы
Postgres/Redis в CI.

# 4. Out of Scope

- Вход по паролю, refresh-ротация, logout, блокировка 15 мин — слайс 2 («Уже есть аккаунт? Войти» ведёт на
  временную заглушку входа).
- Сброс пароля — слайс 3. Опрос и геопозиция — слайс 4 (после подтверждения — сразу Главная).
- Веб-страницы для ссылок без приложения и universal links — слайс 5.
- Окончательные тексты согласия и ссылки на документы (OQ13): текст из прототипа, ссылки «Политика» и
  «Соглашение» — без перехода до появления документов.
- Подтверждение при другом вошедшем аккаунте (OQ24).

# 5. Architecture Context

- api: модуль `apps/api/src/modules/identity` (controller → service → repository; `jobs/`), инфраструктура
  `src/infra/{mail,outbox,redis}`; worker — публикатор outbox, отправка писем, очистка.
- contracts: новые схемы auth — только добавления (старых клиентов нет).
- Миграция: новые таблицы, расширение `citext` не нужно — e-mail нормализуется в приложении + unique-индекс.
- Очереди: `email` (jobId = id outbox-события), `identity-maintenance` (по расписанию).

# 5.1 Placement & Reuse Gate

- Схемы — `packages/contracts/src/auth.ts` (расширяем существующий `RegisterRequest`, `ageInYears`).
- Валидация входа — `ZodValidationPipe`; ошибки — `ApiError`/`ErrorCode` из contracts.
- outbox — существующая таблица `outbox`; публикатор — `src/infra/outbox`, модули о нём не знают кроме записи события.
- Mobile UI — только `components/ui` + `AsyncContent`; новое (`DateField`) — в систему (AGENTS.md §4.11).
- Строки — `@on-bike/i18n`.

# 6. Relevant Files

- `apps/api/src/modules/identity/*` — контроллер, сервис, репозиторий, токены, задачи.
- `apps/api/src/infra/{database/schema.ts,mail/*,outbox/*,redis/*}` — инфраструктура.
- `apps/api/drizzle/0002_*.sql` — миграция.
- `packages/contracts/src/auth.ts`, `packages/api-client/src/index.ts`.
- `apps/mobile/src/app/(auth)/*`, `apps/mobile/src/features/auth/*`, `apps/mobile/src/components/ui/date-field.tsx`.
- `infra/docker-compose.dev.yml`, `.github/workflows/ci.yml`.

# 7. Implementation Notes

- Токены: 32 байта `crypto.randomBytes`, base64url; в БД — SHA-256. Ссылка: `${APP_LINK_BASE}auth/verify/<token>`.
- Токен регистрации — не access-токен: годится только для `poll` и `resend`, обменивается на сессию один раз (AD-28).
- argon2id — `@node-rs/argon2` (prebuilt, без сборки), параметры OWASP (19 MiB, t=2, p=1).
- Обработчики HTTP не шлют письма сами — пишут outbox-событие в той же транзакции.

# 8. Risks / Assumptions / Open Questions

- [ASSUMPTION] Повторная регистрация на неподтверждённый e-mail — `EMAIL_TAKEN` (адрес освобождается через 7 дней).
- [ASSUMPTION] Подтверждение на другом устройстве без `registrationToken` — экран «E-mail подтверждён» без входа
  («Войдите на устройстве, где регистрировались» — до слайса 2 текстом).
- OQ13, OQ24, OQ26 — открыты (см. прототип).

# 8.1 Requirements Consistency

- **Противоречие в источнике:** AD-28 (нет токенов неподтверждённым) vs V-09 (автовход) → решено человеком:
  отдельный токен регистрации ограниченного назначения.
- **B1 (architect, блокер):** «в БД только хеш» + «письмо шлёт worker из outbox» несовместимы для случайного
  токена ссылки → токен ссылки = base64url(HMAC-SHA256(`EMAIL_TOKEN_SECRET`, "email-verify:" + id строки)),
  в БД — sha256(token); сырого токена нет ни в outbox, ни в Redis, ни в логах; ретрай письма даёт ту же ссылку.
- TTL `registrationToken` скользящий: каждый resend продлевает до срока новой ссылки (иначе V-09 ломается на 23-м часу).
- Потерянный ответ poll (обрыв после коммита) → 401 на повторе → экран «E-mail подтверждён. Войдите» (слайс 2).
- Гард слайса 1 смотрит на непросроченный refresh (access 15 мин; refresh-ротация — слайс 2).
- Неизвестный токен ссылки (аккаунт удалён по V-10 или мусор) → 404 → экран «Ссылка больше не действует»
  с переходом к регистрации [ASSUMPTION — кадра в прототипе нет].
- Expo Go не открывает `onbike://`: `APP_LINK_BASE` в dev с Expo Go = `exp://<LAN-IP|127.0.0.1>:8081/--/`,
  в сборках — `onbike://` (решение Q3 — база ссылок в конфиге — сохраняется).
- Стек регистрации — группа `(onboarding)`; ссылка — реальный сегмент `src/app/auth/verify/[token].tsx`.
- Возраст 18+ считается по «сегодня» в Europe/Minsk; дата из пикера — из локальных компонентов (без UTC-сдвига).
- Лимит регистраций по IP — 20/ч [ASSUMPTION, CGNAT]; `TRUST_PROXY` для Caddy.
- Согласия — append-only `user_consents` (kind, version, accepted_at), не колонки users (security §6).
- D-07 в слайсе 1: `EMAIL_UNAVAILABLE` = есть строка с `deleted_at`; переход на таблицу хешей заблокированных
  адресов — в слайсе удаления аккаунта.
- `EMAIL_TAKEN` / `EMAIL_UNAVAILABLE` раскрывают существование адреса — принято прототипом; смягчение — лимит по IP.

# 8.2 Deviations from spec

- Токен ссылки — HMAC (B1), а не randomBytes (§7). Решение architect, в рамках Q1.
- Таблицы identity — `modules/identity/identity.schema.ts`, не `infra/database/schema.ts` (infra не знает доменных таблиц).
- Контракты — `packages/contracts/src/auth/*.schema.ts` (по `.claude/rules/contracts.md`), `auth.ts` переносится.
- HTTP-тесты — Fastify `app.inject()` вместо supertest (тот же уровень e2e без лишней зависимости).
- Зависимости закреплены на версиях старше суток: `nodemailer` 10.1.7, `zustand` 5.0.15.
- (coder, бэкенд) `FieldErrorCode` + `INVALID` — общий код для полей без своего кода (не-строка, лишние ключи), чтобы
  `ValidationErrorDetails.code` всегда был из enum.
- (coder) `Email` в контракте срезает пробелы по краям (автоподстановка клавиатуры); регистр приводит `normalizeEmail` на сервере.
- (coder) `ageInYears(birthDate, today)` принимает календарные даты `YYYY-MM-DD` (+ `minskToday(now)`), вместо `Date` в UTC.
- (coder) Одна галочка согласия → две записи `user_consents` (`personal_data`, `agreement`) с `AGREEMENT_VERSION`.
- (coder) `GET /verification/:token` с токеном не по формату → 404 (как «мусор», §8.1), а не 400; confirm с плохим телом — 400.
- (coder) `resend` продлевает только живой и не обменянный `registrationToken` (истёкший не воскрешается).
- (coder) Payload события для задачи читает `infra/outbox/outbox.reader.ts` (`OutboxReader`): в задаче только `outboxEventId`.
- (coder) Rate-limiter получает «сейчас» от `CLOCK` параметром Lua (TTL ключа — только уборка) — тесты с фиксированными часами.
  Ключ лимита по IP — HMAC(секрет, IP) (было sha256 — исправлено по ревью). Письмо при регистрации ставит паузу и считается первым из 10 внутри транзакции (Redis упал → откат, 500).
- (coder) Логи: Nest `Logger` (pino в проекте не подключён); для 500 пишется имя ошибки, код драйвера и только кадры стека —
  сообщение `DrizzleQueryError` содержит SQL с параметрами.
- (coder) Ответы `/v1/auth/*` — `Cache-Control: no-store`; лимит тела Fastify 64 KiB; `enableShutdownHooks` — в `main.ts`, не в `http-app.ts`.
- (coder) `packages/api-client/vitest.config.ts` — тесты берут исходники `@on-bike/contracts` (условие `@on-bike/source`), а не устаревший `dist`.
- (coder) Задача письма пропускает также просроченную ссылку (кроме заменённой, использованной, подтверждённого/удалённого аккаунта).
- (coder, mobile) Суточный лимит писем: «Слишком много писем. Попробуйте позже.» + отсчёт по `retryAfterSec` вместо
  «через 15 минут» прототипа — сервер отдаёт точную паузу (у окна 10/сутки это часы).
- (coder, mobile) «E-mail подтверждён» без «Дальше — короткий опрос» (опрос — слайс 4); сессия пишется в SecureStore
  сразу при `verified`, переключение гарда на вкладки — через ~1 с.
- (coder, mobile) 401 на poll/resend → экран «Войдите в аккаунт» (текст [ASSUMPTION]) с «Войти» на заглушку входа.
- (coder, mobile) Подписи ссылок «Политика обработки данных» / «Пользовательское соглашение» не показаны (OQ13:
  документов нет, переходов нет) — текст согласия и соглашения из прототипа есть.
- (coder, mobile) Ошибки полей — один текст на код (не на пару поле+код); кнопка «Зарегистрироваться» выключена,
  пока у формы есть ошибки (как в кадрах Under 18 и D-07), проверка — при уходе с поля (`mode: onTouched`).
- (coder, mobile) Button `loading` сохраняет цвета варианта (не disabled-вид): индикатор внутри, нажатие выключено, `busy`.
- (coder, mobile) DateField: iOS — колесо под полем с «Готово», Android — системный диалог; пустое поле открывает
  пикер на «18 лет назад». Поле и TextField делят оболочку `field-frame.tsx`; TextField получил `helper`,
  `autoCapitalize`, `autoCorrect`.
- (coder, mobile) Зависимости mobile: + `@on-bike/contracts` (workspace) и `zod` (catalog) — схема формы из контракта.
- **Web (AGENTS.md §4.13, находка Codex HIGH):** web-реализаций `DateField` и хранилища сессии нет — по решению
  человека веб делается задачей-основой сразу после этого слайса; переходный период записан в §4.13. Нативное
  изолировано в `features/auth/secure-storage.ts`, `components/ui/date-field.tsx`, `lib/query-client.ts`.
- **Экран ссылки:** заголовок зависит от состояния ссылки (valid / expired / verified), поэтому сразу видна
  постоянная шапка сценария «Регистрация» (как навигация в прототипе), а скелетон — только на месте данных.

# 8.3 Security checklist

1. **AuthN/AuthZ:** все эндпоинты публичные; `poll`/`resend` — только по `registrationToken`; confirm — по токену ссылки.
2. **Входные данные:** zod-контракт; e-mail ≤ 254, пароль 8–128; возраст 18+ проверяется на сервере.
3. **Данные наружу:** ответы без `password_hash`, дат рождения, id; e-mail — только владельцу токена/ссылки.
4. **Злоупотребления:** rate-limit повтора (60 с, 10/сутки), регистрация — лимит по IP; нейтральный отказ D-07.
5. **Секреты и логи:** токены и e-mail не логируются; в БД — только хеши токенов; `JWT_SECRET` — env.
6. **Аудит:** согласие и версия соглашения с отметкой времени; подтверждение — `email_verified_at`.

# 9. Acceptance Criteria

1. Регистрация: валидные данные → 201 + `registrationToken`, аккаунт не активен, письмо в Mailpit со ссылкой.
2. < 18, без согласия, короткий пароль → 400 `VALIDATION_FAILED` (ошибки по полям); занятый e-mail → 409 `EMAIL_TAKEN`;
   удалённый → 409 `EMAIL_UNAVAILABLE` (без раскрытия причины).
3. GET по ссылке ничего не меняет; POST confirm активирует, повторный — 200 (идемпотентно); устаревшая/заменённая — 410 `LINK_EXPIRED` + e-mail.
4. Повтор: раньше 60 с или > 10/сутки → 429 `RATE_LIMITED` + `retryAfterSec`; новая ссылка отменяет прежние.
5. Poll: до подтверждения — `pending`; после — `verified` + сессия ровно один раз; повторный обмен — 401.
6. Неподтверждённые старше 7 дней удаляются задачей; подтверждённые — нет.
7. Mobile: регистрация → «Подтвердите e-mail» → ссылка из Mailpit на телефоне → «Подтвердить e-mail» →
   «E-mail подтверждён» → Главная без ввода пароля; ошибки полей и отказы — по прототипу; все экраны — из
   дизайн-системы, загрузки — скелетоны/состояния кнопки (§4.11–§4.12).
8. Интеграционные тесты API на реальном PostgreSQL + Redis; `pnpm check` зелёный, в CI — тоже.

# 10. Documentation Impact

- `docs/architecture/README.md` — поток регистрации, outbox-публикатор, почта.
- `docs/runbooks/README.md` — Mailpit в dev, переменные `SMTP_URL`, `MAIL_FROM`, `APP_LINK_BASE`, `JWT_SECRET`.
- ADR-0002 — токен регистрации (решение по AD-28 / V-09).

# 11. Implementation Context

(architect, 2026-10-22; полный отчёт — в истории задачи)

**ENTRY POINTS**
- `apps/api/src/main.ts` → новый `http-app.ts` (`createHttpApp()`: Fastify, `trustProxy`, префикс `v1`; его же
  используют e2e-тесты) → `AppModule` → `IdentityModule` → `auth.controller.ts`.
- `apps/api/src/worker.ts` → `WorkerModule` → `OutboxPublisherModule.forRoot({ routes })`, `IdentityWorkerModule`.
- `apps/mobile/src/app/_layout.tsx` (QueryClient + onlineManager/NetInfo, гидрация сессии под splash, `Stack.Protected`),
  `apps/mobile/src/app/auth/verify/[token].tsx`.

**API — новое**
- `common/domain-error.ts` (`DomainError(code, status, details?)`), `common/api-exception.filter.ts` (через `APP_FILTER`;
  DomainError / HttpException / ошибки Fastify → `ApiError`; прочее → 500 `INTERNAL` без стека и тела; 429 — `Retry-After`).
- `common/zod-validation.pipe.ts`: details → `{ fields: [{ path, code }] }` без `input`.
- `infra/database/{executor.ts (DbExecutor = Database | Tx), errors.ts (isUniqueViolation: e.cause.code === '23505')}`.
- `infra/clock/clock.module.ts` (global `CLOCK`, `now()`); TTL сравниваются с параметром, не с `now()` SQL.
- `infra/redis/{redis.module.ts (REDIS, ioredis), rate-limiter.ts (cooldown + fixedWindow атомарно через Lua, retryAfterSec)}`.
- `infra/mail/{mail.module.ts, mailer.ts}` (`MAILER.send({to, subject, html, text})`, nodemailer `createTransport(SMTP_URL)`).
- `infra/outbox/{outbox.writer.ts (append(tx, {type, payload})), outbox.publisher.ts, outbox.module.ts}`; публикатор —
  цикл в worker (~1 с): `FOR UPDATE SKIP LOCKED` по известным типам, `queue.add(type, {outboxEventId}, {jobId: id})`,
  `published_at`; маршруты type → queue задаёт composition root (`worker.module.ts`).
- `infra/queue/queues.ts`: + `email`, `identityMaintenance`.
- `modules/identity/`: `identity.schema.ts` (Drizzle), `auth.controller.ts` (тонкий), `registration.service.ts`,
  `verification.service.ts`, `session.service.ts` (jose HS256, iss/aud/exp, sub+sid; refresh — randomBytes, в БД sha256),
  `password-hasher.ts` (@node-rs/argon2: algorithm не передавать — дефолт Argon2id; m=19456, t=2, p=1; async),
  `tokens.ts` (random, sha256, HMAC-derive), `identity.repository.ts` (DbExecutor), `identity.events.ts`
  (`identity.verification-email-requested` { verificationTokenId }), `mail/verification-email.ts` (HTML + text,
  экранирование), `jobs/{verification-email.processor.ts, cleanup-unverified.processor.ts, identity-schedules.ts}`,
  `identity.module.ts` (`IdentityModule`, `IdentityWorkerModule`), `index.ts` (+ `identityOutboxRoutes`).
- `config/env.ts`: `JWT_SECRET` (min 32), `EMAIL_TOKEN_SECRET` (min 32), `SMTP_URL`, `MAIL_FROM`, `APP_LINK_BASE`
  (оканчивается `/`), `TRUST_PROXY`, `AGREEMENT_VERSION`; `.env.example` — плейсхолдеры.
- `drizzle.config.ts`: schema = `infra/database/schema.ts` + `modules/*/*.schema.ts`.

**Схема БД (`0002`, expand-only; PK `uuid DEFAULT uuidv7()`; время — timestamptz)**
- `users`: email (CHECK = lower, UNIQUE полный — включая удалённых), password_hash, birth_date (date, mode string),
  email_verified_at, created_at, deleted_at; частичный индекс `(created_at) WHERE email_verified_at IS NULL AND deleted_at IS NULL`.
- `user_consents`: user_id FK CASCADE, kind (`personal_data` | `agreement`), version, accepted_at — append-only.
- `email_verification_tokens`: user_id FK CASCADE, token_hash UNIQUE, created_at, expires_at, used_at, superseded_at,
  sent_at; индекс (user_id); `UNIQUE (user_id) WHERE used_at IS NULL AND superseded_at IS NULL`.
- `registration_tokens`: user_id FK CASCADE UNIQUE, token_hash UNIQUE, expires_at, consumed_at.
- `sessions`: user_id FK CASCADE, refresh_token_hash UNIQUE, created_at, expires_at, revoked_at; индекс (user_id).
- `outbox`: + `outbox_unpublished_idx (created_at) WHERE published_at IS NULL`.

**Гонки**: любая мутация identity сначала `SELECT … FROM users WHERE id = $1 FOR UPDATE`. confirm: подтверждён → 200
`verified` (приоритет над expired); иначе просрочено/заменено → 410 `LINK_EXPIRED {email}`; иначе активация + used_at.
poll: `UPDATE registration_tokens SET consumed_at … WHERE … consumed_at IS NULL AND expires_at > $now AND
email_verified_at IS NOT NULL RETURNING` в одной транзакции с вставкой сессии; 0 строк → отличить pending от 401.
resend: сначала Redis (cooldown 60 с + окно 10/24 ч одним Lua), затем транзакция: supersede, новый токен, outbox,
продление registration_token. Регистрация ставит cooldown и считается первым письмом. Redis недоступен → 500.
Регистрация одного e-mail параллельно → 23505 → `EMAIL_TAKEN`. Cleanup: батчи по 1000.

**Contracts** (`src/auth/{registration,verification,session}.schema.ts`): `RegisterRequest` (+ birthDate ≥ 1900 и не
в будущем; сообщения = коды полей), `RegisterResponse { registrationToken, email, resendAvailableInSec }`,
`VerificationToken` (`^[A-Za-z0-9_-]{43}$`), `VerificationLinkInfo` (union по state: valid | verified | expired, все с email),
`ConfirmVerificationRequest/Response`, `ResendVerificationRequest` (`{registrationToken} | {linkToken}`) →
`{ resendAvailableInSec } | { state: 'verified' }`, `RegistrationPollRequest/Response` (`pending` | `verified` + session),
`Session { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }`, `normalizeEmail()`;
`ErrorCode` + `EMAIL_TAKEN`, `EMAIL_UNAVAILABLE`, `LINK_EXPIRED`; `FieldErrorCode` (REQUIRED | INVALID_EMAIL |
TOO_SHORT | TOO_LONG | INVALID_DATE | AGE_BELOW_18 | CONSENT_REQUIRED); `ValidationErrorDetails`, `RateLimitedDetails`,
`LinkExpiredDetails`. Невалидный registrationToken → 401 `UNAUTHORIZED`; неизвестный токен ссылки → 404 `NOT_FOUND`.
api-client: толерантный парсинг ошибки (`ApiHttpError.apiError` с кодом `UNKNOWN` для неизвестных).

**i18n**: `t(key, params)` с подстановкой. **Button**: `loading` (состояние мутации, §4.12).

**Mobile**: `src/app/(onboarding)/{_layout,register,check-email,sign-in}.tsx` (sign-in — заглушка до слайса 2),
`src/app/auth/verify/[token].tsx`; `src/features/auth/{session-store,registration-store,secure-storage,queries,error-messages}.ts`;
`src/lib/{api,query-client}.ts` (`EXPO_PUBLIC_API_URL`); `src/components/ui/date-field.tsx` (+ тест + `/ui-kit`).

**TESTS**: интеграционные `*.int.test.ts` — отдельный vitest project, `globalSetup` пересоздаёт `onbike_test`
(`DROP … WITH (FORCE)`, `CREATE`, migrate) и использует Redis db 1; `TRUNCATE … CASCADE` + `FLUSHDB` перед тестом;
фиксированный CLOCK; fake MAILER; `turbo.json` test.env: `DATABASE_URL_TEST`, `REDIS_URL_TEST`. Матрица — отчёт architect.

**OUT OF SCOPE**: вход, refresh-ротация, logout, AuthGuard; сброс; опрос; веб-страницы; удаление аккаунта;
очистка outbox; Maestro; Dockerfile API.

# 12. Outcome

**Бэкенд (coder, 2026-10-22)** — contracts, api-client, i18n, apps/api, infra env, docs. Mobile — следующий этап.

- contracts: `src/auth/{registration,verification,session}.schema.ts` (перенос `auth.ts`), `ErrorCode` + `EMAIL_TAKEN`,
  `EMAIL_UNAVAILABLE`, `LINK_EXPIRED`; `FieldErrorCode`, `ValidationErrorDetails`, `RateLimitedDetails`, `LinkExpiredDetails`;
  `normalizeEmail`, `minskToday`, возраст 18+ по Europe/Minsk.
- api-client: `register`, `getVerificationLink`, `confirmVerification`, `resendVerification`, `pollRegistration`;
  `ApiHttpError.apiError` (неизвестный код → `UNKNOWN`). i18n: `t(key, params?)` с `{name}`.
- api: миграция `0002_identity` (users, user_consents, email_verification_tokens, registration_tokens, sessions,
  `outbox_unpublished_idx`; `uuidv7()`, частичные индексы, CHECK lower(email)); `http-app.ts`, `ApiExceptionFilter` (APP_FILTER),
  `DomainError`, pipe с кодами полей; `infra/{clock,redis (Lua rate-limiter),mail (nodemailer),outbox (writer/reader/publisher SKIP LOCKED)}`;
  модуль `identity` (HTTP + worker: письмо, очистка 03:00 Europe/Minsk батчами по 1000).
- Тесты: 68 в apps/api (unit + `*.int.test.ts` на реальных PostgreSQL/PostGIS `onbike_test` и Redis db 1), contracts 19,
  api-client 10, i18n 2. `pnpm check` — зелёный.
- Ручная проверка: собранный worker + dev API на `127.0.0.1:3000` → register 201 → письмо в Mailpit со ссылкой
  `exp://127.0.0.1:8081/--/auth/verify/<43 символа>`, sha256 совпадает с БД → GET valid → confirm 200 (повтор 200) →
  poll verified + сессия, повтор 401; resend раньше 60 с → 429 + Retry-After.
- Документы: ADR-0002, `docs/runbooks/local-dev.md`, раздел регистрации и outbox в `docs/architecture/README.md`.
- Не сделано в этом этапе: mobile (экраны, сессия, DateField, Button `loading`), строки i18n для мобилки.

**Mobile (coder, 2026-10-22)** — apps/mobile, строки в `packages/i18n/src/ru.ts`.

- Дизайн-система: `DateField` (нативный пикер, локальная дата без UTC-сдвига, helper/ошибка/disabled, a11y),
  `Button` `loading`, `TextField` `helper`; общая оболочка `field-frame.tsx`; примеры на `/ui-kit`.
- `lib/api.ts` (`EXPO_PUBLIC_API_URL`, dev — `http://127.0.0.1:3000`), `lib/query-client.ts` (onlineManager ← NetInfo,
  повтор только сети и 5xx, мутации без повтора), `lib/countdown.ts`, `lib/calendar-date.ts`; `.env.example`.
- `features/auth`: `secure-storage` (единственная точка expo-secure-store), `session-store` (гард — живой refresh),
  `registration-store` (токен + e-mail + пауза повтора, SecureStore, 24 ч скользящие), `queries`, `error-messages`,
  `use-sign-in-when-verified`, `auth-screen`, `verification-states`.
- Маршруты: корневой `_layout` (QueryClient, гидрация под splash, `Stack.Protected`), `(onboarding)/{register,
  check-email,sign-in}`, `auth/verify/[token]` (вне гарда). Нативные модули — только в secure-storage / date-field /
  query-client (под будущий web — файлом `.web.ts` рядом).
- Тесты (jest-expo, 18 наборов, 121 тест): DateField, Button loading, TextField helper, сторы, тексты ошибок,
  форма регистрации, «Подтвердите e-mail» (fake timers, 429, poll → сессия → Главная, 401, восстановление),
  экран ссылки (valid/confirm, expired/resend, 410, 404, офлайн, сетевая ошибка), гард и deep link
  (`exp://127.0.0.1:8081/--/auth/verify/<token>` и `onbike://…` разбираются Router в `auth/verify/[token]`).
- `pnpm check` — зелёный; `expo export --platform android` — собирается без предупреждений Metro.
- Ручная проверка acceptance 7 (автор, Android, Expo Go): форма → отказ «младше 18» → регистрация → «Подтвердите e-mail»
  → письмо в Mailpit → ссылка `exp://…/--/auth/verify/<token>` (GET без побочных эффектов, проверено в БД) →
  «Подтвердить e-mail» → «E-mail подтверждён» → Главная без пароля; в БД verified, одна сессия, токен регистрации погашен.
  NOT VERIFIED: iOS (пикер), тёмная тема экранов вживую, VoiceOver/TalkBack.

**По ревью (автор)** — Codex pass 1–3, Claude pass 1–2 (оба финально APPROVE):
- очистка vs confirm: условия во внешнем DELETE + тест на двух соединениях; письмо: захват с ограниченным сроком
  `send_claimed_at` (миграция 0003) + `sent_at` после SMTP, вне транзакций, таймауты SMTP; `PollProblem` на обоих экранах;
  постоянная шапка «Регистрация»; HMAC ключа IP; `TRUST_PROXY` — число хопов (e2e-тест подмены XFF); очередь
  `identity-email`; устойчивость к сбоям SecureStore (регистрация, вход, очистка); `keepTogether` для e-mail; §4.13 «Переход».
- Тесты итого: api 74, mobile 130, contracts 19, api-client 10, i18n 2; `pnpm check` — зелёный.
