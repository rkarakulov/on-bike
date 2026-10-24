# Переименование проекта on-bike → pokatim

## 1. Title
Внутреннее имя проекта `on-bike` (и формы `on_bike`, `onbike`, `ON_BIKE`, `OnBike`) → `pokatim` во всех внутренних
именах: npm-scope, приложение, API, БД, инфраструктура, CI, документы. Пользовательский бренд «Покатим» уже сделан
(`docs/product/brand.md`).

## 2. Goal
Решение автора 2026-10-25: одно имя проекта везде. Будущие `copier update` рендерят `pokatim`. Dev-стенд после
первого деплоя с новыми именами переезжает сам: секреты сохраняются, старый стек остановлен, тома не удалены.

## 3. Scope (инвентарь `git grep -i -E 'on-bike|on_bike|onbike|on bike'`, 1238 строк на старте)

| Вид | Где | Было → стало |
|---|---|---|
| npm-scope, корневой пакет | все `package.json`, импорты, `jest.mock`, tsconfig `customConditions`, vite/vitest/jest/metro conditions, `tsconfig.depcruise.json` paths, `--filter` в scripts, CI, Dockerfile, документы; `pnpm-lock.yaml` | `@on-bike/*` → `@pokatim/*`, `@on-bike/source` → `@pokatim/source`, `on-bike` → `pokatim` |
| Ответы шаблона | `.copier-answers.yml` | `project_name`, `project_slug`, `npm_scope` → `pokatim`; `app_scheme` → `pokatim`; `bundle_id` → `by.pokatim.app` |
| Приложение | `apps/app/app.json`, хранилища | slug `on-bike`, scheme `onbike`, `by.onbike.app`; ключи `onbike.session`, `onbike.registration`, `onbike.signOutPending`, Web Lock `onbike.session-refresh` → `pokatim.*` |
| API | contracts `SESSION_COOKIE`, `identity.policy.ts` | cookie `__Secure-onbike_rt` → `__Secure-pokatim_rt`; JWT `on-bike`/`on-bike-app` → `pokatim`/`pokatim-app`; ссылки `onbike://` → `pokatim://` (тесты, `.env.example`) |
| Дизайн-токены | `packages/design-tokens` | тип `OnBikeRoleGroups` → `PokatimRoleGroups` |
| БД | `drizzle.config.ts`, `test/test-env.ts`, `.env.example`, compose dev и deploy, CI | `on_bike`/`on_bike_test` → `pokatim`/`pokatim_test` (пользователь, пароль dev, имя БД) |
| Инфраструктура | `infra/deploy/*`, `infra/docker/Dockerfile`, `infra/docker-compose.{dev,prod}.yml`, `infra/Caddyfile`, `infra/.env.example` | образы `on-bike-{api,web,admin}` → `pokatim-*`; label `by.on-bike.project` → `by.pokatim.project`; compose `on-bike-dev` → `pokatim-dev`, `on-bike` → `pokatim`; `~/on-bike` → `~/pokatim`; vhost `on-bike` → `pokatim`; `ON_BIKE_*`/`ONBIKE_*` → `POKATIM_*`; имена nginx `onbike_mail_connection`, `onbike_ssl` → `pokatim_*` |
| GitHub | `.github/workflows/{ci,deploy-dev}.yml` | `IMAGE_PREFIX`, cache scope, каталог на сервере, `--filter`, БД сервисов CI |
| Документы | `AGENTS.md`, `README.md`, `CLAUDE.md`, `.claude/rules/*.md`, `docs/{adr,architecture,product,runbooks,README.md}`, `docs/proposal-stack-architecture.md` | имя проекта; `.claude/rules/onbike-*.md` → `pokatim-*.md` (`git mv`, ссылки) |

## 4. Out of Scope
- Переименование репозитория GitHub (`rkarakulov/on-bike`) — оркестратор после слияния. До него ссылки на
  репозиторий (`org.opencontainers.image.source`, `gh api repos/rkarakulov/on-bike/...`, URL клона) остаются.
- Исторические `docs/tasks/*` (журнал) — не переписываются; ссылки из них на переименованные `.claude/rules/*`
  сборку не ломают (link-check в проекте нет).
- Перенос данных dev-БД — новая БД `pokatim` стартует пустой.
- Домены почты на сервере (`MAIL_FROM` в `.env` сервера) — не меняются.
- Секреты и `environment: dev` GitHub — не меняются.

## 5. Решения
- **Миграция dev-стенда — в `deploy.sh` (`migrate_legacy_stack`), идемпотентно.** Старое расположение —
  `POKATIM_LEGACY_DIR` (умолчание `~/on-bike`) и `POKATIM_LEGACY_PROJECT` (`on-bike-dev`).
  - Нет `~/pokatim/.env`, есть `~/on-bike/.env` → копия (600) в `~/pokatim/.env` и `mailpit-relay.yml`; секреты
    (`POSTGRES_PASSWORD`, `JWT_SECRET`, `EMAIL_TOKEN_SECRET`, `MAILPIT_UI_PASSWORD`, `MAIL_RELAY_*`, `MAIL_FROM`)
    сохраняются. Ключ `ON_BIKE_TAG` убирает bootstrap (управляемый ключ прежнего имени).
  - Старый стек (`docker compose -p on-bike-dev`) останавливается `down --remove-orphans` **без `-v`** — после pull
    новых образов, до `up` нового (порты хоста те же). Тома `on-bike-dev_pgdata`/`_redisdata` остаются сиротами —
    ручная уборка в runbook.
  - Старый vhost: bootstrap после установки своего `pokatim` снимает `/etc/nginx/sites-{available,enabled}/on-bike`,
    только если файл сгенерирован нашим bootstrap (маркер в первой строке); `nginx -t` перед reload, ошибка —
    файл возвращается.
  - Сертификат — `live/<PUBLIC_HOST>`, от имени сайта не зависит: переиспользуется.
  - Прочистка образов — по обоим label (`by.pokatim.project=pokatim` и прежнему `by.on-bike.project=on-bike`).
- **Ключи хранилищ, cookie, JWT — без миграции значений.** Dev-стенд, пользователей нет: после обновления вход
  заново (старые refresh-cookie/ключи просто не читаются). Старые ключи в SecureStore/localStorage остаются
  неиспользуемыми.
- **Локальная разработка:** compose project `pokatim-dev`, БД `pokatim` (новые тома). Переезд — runbook local-dev.
- **Адреса почты в шаблонах:** `apps/api/.env.example`, `infra/.env.example` → `no-reply@limedolphin.com`
  (домен, проверенный в SES); тестовые — `@pokatim.test`.
- **GitHub repo URL не меняется** до переименования репозитория (см. Out of Scope).

## 8.2 Deviations from spec
—

## 8.3 Security checklist
1. AuthN/AuthZ: логика не меняется; меняются имена cookie и issuer/audience JWT — проверка подписи и `aud`/`iss`
   по-прежнему строгая (тесты сессии сверяют новые значения).
2. Входные данные: без изменений.
3. Данные наружу: без изменений.
4. Злоупотребления: без изменений (ключи лимитов не содержат имени проекта).
5. Секреты и логи: миграция `.env` — копия на том же сервере, `umask 077`, 600; значения не печатаются. В
   репозитории — без IP и секретов.
6. Аудит: не затронут.

## 9. Acceptance Criteria
- AC1. `git grep -i -E 'on-bike|on_bike|onbike|on bike'` — остатки только оправданные (список в §12).
- AC2. `pnpm install` (lockfile обновлён), `pnpm check` — EXIT 0.
- AC3. `pnpm build:web`; `pnpm e2e:web` без API и с `E2E_API=1` — зелёные.
- AC4. `expo export -p android` — успешно.
- AC5. shellcheck скриптов `infra/deploy/*.sh`, actionlint workflows — без замечаний.
- AC6. Локальный прогон `deploy.sh` с временным HOME: стек со старыми именами (`~/on-bike`, проект `*-on-bike-*`)
  → новый: `.env` перенесён (секреты те же), старый стек остановлен (тома на месте), новый поднят, smoke зелёный.
- AC7. `copier update --pretend` с новыми ответами — дифф минимален (только ожидаемое).

## 10. Documentation Impact
`docs/runbooks/deploy.md` (миграция стенда, уборка сирот), `docs/runbooks/local-dev.md` (переезд dev compose),
`docs/product/brand.md` (внутреннее имя — pokatim), остальные документы — замена имени.

## 12. Outcome
