# Автодеплой dev-стенда on-bike на общий EC2 (develop → GHCR → SSH)

## 1. Title
Каждый push в `develop` проходит CI, собирает образы api/web/admin в GHCR и разворачивает стенд на dev-сервере.

## 2. Goal
Живой стенд для автора и тестеров без ручных шагов на сервере, по образцу деплоя AI-copilot-tri (`deploy-develop-device.yml`,
`infra/deploy/*`), но на контейнерах: сервер ничего не собирает, секреты стенда генерируются и живут только на сервере.

## 3. Scope
- `infra/docker/Dockerfile` (цели `api`, `web`, `admin`), `infra/docker/runtime-deps.mjs`, `infra/docker/admin-nginx.conf`,
  `.dockerignore`; `apps/admin/vite.config.ts` — `base` из `ADMIN_BASE` (по умолчанию `/`), `turbo.json` — env `ADMIN_BASE`.
- `infra/deploy/{deploy.sh,bootstrap.sh,docker-compose.yml,env.template}` — стек на сервере, идемпотентная подготовка.
- `.github/workflows/deploy-dev.yml`; `.github/workflows/ci.yml` — push `[main, develop]`, `workflow_call`.
- `docs/runbooks/deploy.md`, строка в `docs/runbooks/README.md`.

## 4. Out of Scope
- prod (`main`) и его сервер; `infra/docker-compose.prod.yml`/`infra/Caddyfile` не меняются.
- Бэкапы БД стенда, мониторинг, алерты.
- Первый деплой и любые действия на сервере (делает оркестратор после слияния).

## 5. Architecture Context
- Сервер общий (eradar, teammd, n8n): nginx хоста держит 80/443, ACME — webroot `/var/www/html`; заняты порты 3000, 3001,
  5000, 5001, 5003–5004, 5432, 5555, 6379, 8000, 8071, 9890. Свои postgres/redis — без портов хоста.
- Миграции — отдельный шаг деплоя (AGENTS.md §4.6): одноразовый контейнер `migrate` (drizzle-kit из образа api).
- Один origin за прокси: `/v1/*` → api, `/admin/*` → admin, `/` → web (как Caddy `PUBLIC_HOST` в `infra/Caddyfile`);
  CORS выключен, CSRF — same-origin.

## 5.1 Placement & Reuse Gate
- Образы: один Dockerfile с целями — общий слой установки монорепо; runtime — только замыкание нужных пакетов
  (`runtime-deps.mjs`), версии ровно из lockfile.
- Миграции — существующий `drizzle-kit migrate` + `apps/api/drizzle.config.ts` (команда из комментария `docker-compose.prod.yml`).
- Web-сервер — существующий `apps/app/server/main.ts` (без изменений); admin — существующая сборка Vite.
- Общий код `@rkarakulov/*` не меняется.

## 6. Relevant Files
`infra/docker-compose.prod.yml`, `infra/Caddyfile`, `apps/api/{package.json,drizzle.config.ts,src/config/env.ts}`,
`apps/app/server/*`, `apps/admin/vite.config.ts`, `.github/workflows/ci.yml`, `docs/runbooks/local-dev.md`.

## 7. Implementation Notes
- **Домен:** repo variable `DEV_PUBLIC_HOST`, дефолт `pokatim-dev.13-61-174-165.sslip.io` (wildcard DNS sslip.io → IP сервера);
  постоянный — `pokatim-dev.limedolphin.com` (DNS позже), переход — сменой переменной и деплоем.
- **Порты хоста (127.0.0.1):** api 3100, web 8180, admin 8181, Mailpit UI 8125.
- **Админка — путь `/admin/`** того же домена (не поддомен: один DNS и один сертификат). Сборка с `ADMIN_BASE=/admin/`,
  клиент API — относительный `/v1` (тот же origin). Caddy-прод (`ADMIN_HOST`, корень) — умолчание `/`, без изменений.
- **Образы:** `ghcr.io/rkarakulov/on-bike-{api,web,admin}`, теги `sha-<7>` и `develop`; `linux/amd64`;
  `NODE_AUTH_TOKEN` — `--mount=type=secret` (не ARG); runtime — от `node`/`nginx` (не root); label
  `by.on-bike.project=on-bike` для прочистки только своих образов.
- **web:** `EXPO_PUBLIC_API_URL=https://<хост>` — build-arg (публичный), вшивается в клиентский бандл → образ web
  привязан к хосту.
- **Сервер:** GHCR — логин коротким `GITHUB_TOKEN` (stdin по SSH) во временный `DOCKER_CONFIG`, удаляется после pull;
  постоянных кредов нет, `~/.docker` соседей не трогается.

## 8. Risks / Assumptions / Open Questions
- Двойной CI на push в `develop`: `ci.yml` (push) и `ci` внутри `deploy-dev.yml` — по решению оркестратора; группы
  concurrency разведены `github.workflow`, друг друга не отменяют.
- sslip.io — общий домен: лимиты Let's Encrypt возможны → стенд только по http (деплой не падает).
- `ssh-keyscan` без `DEV_SSH_KNOWN_HOSTS` — доверие при первом подключении на каждом прогоне (runbook рекомендует закрепить).
- Лимиты памяти контейнеров суммарно ≤ 2,5 ГБ при ~3,2 ГБ свободных на сервере.

## 8.1 Requirements Consistency
Требования оркестратора не противоречат AGENTS.md §4 (миграции отдельным шагом, секреты вне git/логов). Деплой выполняет
CI после merge человеком в `develop` — merge остаётся за человеком (§7).

## 8.2 Deviations from spec
- Ветка и триггер: решение оркестратора по ходу — `develop` вместо `main`, `push` + reusable `ci.yml` вместо `workflow_run`.
- Тег «плавающий» — `develop`, а не `main` (main зарезервирован под будущий prod).
- `workflow_dispatch` с `image_tag` — откат/повтор без CI и сборки (runbook «Откат»); запуск — только из `develop`.

## 8.3 Security checklist
1. **AuthN/AuthZ:** деплой запускает только push в `develop` (merge человеком) или `workflow_dispatch` (права write на
   репозиторий); вне `develop` preflight падает. Доступ на сервер — отдельный SSH-ключ деплоя (`DEV_SSH_KEY`), проверка
   ключа хоста включена (`StrictHostKeyChecking yes`, known_hosts из секрета или `ssh-keyscan`). `permissions` минимальные:
   workflow — `contents: read`; `packages: write` только у `build`; `packages: read` у `deploy`; `ci` — `contents`,
   `packages`, `pull-requests: read` (нужны вызываемому `ci.yml`).
2. **Входные данные:** `image_tag` — regex `sha-<hex>`|`develop`; `DEV_PUBLIC_HOST` — regex имени хоста (в workflow и в
   `bootstrap.sh`); тег и порты проверяются на сервере; параметры удалённой команды — `printf %q`.
3. **Данные наружу:** наружу — только nginx хоста (80/443); api/web/admin/Mailpit — `127.0.0.1`, PostgreSQL/Redis/SMTP —
   только сеть compose. Mailpit (письма с токенами ссылок) — через SSH-туннель. Admin-контейнер отдаёт только `/admin/`.
4. **Злоупотребления:** `TRUST_PROXY=1`, nginx перезаписывает `X-Forwarded-For` адресом клиента — лимиты API по реальному
   IP, подделка заголовка клиентом не проходит. CSRF same-origin (проверено: чужой `Origin` → 403).
5. **Секреты и логи:** `POSTGRES_PASSWORD`, `JWT_SECRET`, `EMAIL_TOKEN_SECRET` генерируются на сервере (`openssl rand`),
   `.env` — 600 в каталоге 700, значения не печатаются (лог — только имена ключей). `NODE_AUTH_TOKEN` — build secret,
   `~/.npmrc` в слое содержит ссылку на переменную и удаляется в том же RUN; runtime-образы собираются с чистой базы
   (проверено: `docker history` без токенов). `GITHUB_TOKEN` для GHCR — stdin, временный `DOCKER_CONFIG`, logout и
   удаление; токен живёт до конца джоба. `.dockerignore` исключает `.env*`, ключи, `.git`. Секреты GitHub — только
   `DEV_SSH_HOST`, `DEV_SSH_KEY`, `DEV_SSH_KNOWN_HOSTS`.
6. **Аудит:** история деплоев — прогоны GitHub Actions (кто, какой коммит/тег, Summary); на сервере — тег в `.env` и
   `/v1/health` (`version`). Чужие ресурсы сервера не меняются: свой vhost (`nginx -t` + откат своего файла), прочистка
   образов только по своему label, свой compose project и тома.

## 9. Acceptance Criteria
1. `docker build --platform linux/amd64` целей `api`, `web`, `admin` проходит; токен — только build secret.
2. Стек из этих образов тем же `infra/deploy/docker-compose.yml` и тем же `deploy.sh` поднимается локально (свой project):
   миграции отдельным контейнером, `/v1/health` = ok, `/register` — SSR, `/admin/` открывается; повторный деплой
   идемпотентен (секреты не меняются, управляемые ключи переписываются).
3. Отрендеренные vhost (http и https) проходят `nginx -t` (nginx 1.24, как Ubuntu 24.04); через vhost работают `/v1`,
   `/`, `/admin/`, редирект `/admin`.
4. `deploy-dev.yml`: push `develop` → reusable CI → build → deploy; concurrency `deploy-dev` без отмены; preflight секретов;
   actions по SHA; `actionlint` чисто; `shellcheck` и `bash -n` скриптов чисто.
5. `pnpm check` EXIT 0.
6. Runbook: схема, первичная настройка (команды секретов), DNS/TLS и ограничение web-сессии до сертификата, смена домена,
   логи и почта через туннель, откат, ручной запуск.

## 10. Documentation Impact
`docs/runbooks/deploy.md` (новый), `docs/runbooks/README.md`. ADR не нужен: стек и деплой «Docker Compose без Kubernetes»
уже в ADR-0001/`docker-compose.prod.yml`.

## 11. Implementation Context
Задача уровня 2 (инфраструктура, без контрактов и миграций). Проверки — §9; на сервер не заходить.

## 12. Outcome

### Coder, 2026-10-24
**Сделано:** образы (`infra/docker/`), стек и скрипты сервера (`infra/deploy/`), `deploy-dev.yml`, `ci.yml` (push
`develop`, `workflow_call`, группа concurrency с `github.workflow`), admin `base` из `ADMIN_BASE`, runbook.

**Проверки (локально, Docker Desktop, arm64-хост с эмуляцией amd64):**
- `docker build --platform linux/amd64` целей `api` (356 МБ, 134 пакета runtime), `web` (244 МБ, 66 пакетов),
  `admin` (56 МБ) — EXIT 0; `docker history --no-trunc` без токенов; контейнеры — uid 1000 `node` / 101 `nginx`.
- `infra/deploy/deploy.sh` с `ON_BIKE_SKIP_PULL=1 ON_BIKE_SKIP_NGINX=1`, project `on-bike-deploytest`, тот же
  `docker-compose.yml`: `.env` создан (секреты сгенерированы, в лог — только имена ключей), миграции контейнером
  `migrate` (`migrations applied successfully`), `up --wait` всех сервисов, smoke `/v1/health`
  `{"status":"ok","version":"local","checks":{"database":"up"}}`, `/register` 200 (SSR, `<title>Регистрация — on-bike</title>`),
  `/admin/` 200 и бандл `/admin/assets/*.js` 200. Регистрация `POST /v1/auth/register` 201 → worker → письмо в Mailpit со
  ссылкой `https://<хост>/auth/verify/…`. Повторный деплой со сменой хоста: секреты те же (БД с прежним паролем
  мигрирует), `PUBLIC_HOST`/`WEB_ORIGIN`/`APP_LINK_BASE` переписаны, ключи не дублируются; `.env` 600, каталог 700.
- Найдено и исправлено проверкой: на свежем томе миграции падали `the database system is shutting down` — healthcheck
  `pg_isready` по unix-сокету видел временный сервер initdb; теперь по TCP (`-h 127.0.0.1`). Два свежих цикла после
  фикса — зелёные. Тестовый стек снят `down -v` (контейнеров и томов `on-bike-deploytest` — 0).
- Vhost из `bootstrap.sh` (http и https) — `nginx -t` в `ubuntu/nginx:1.24-24.04_beta`: ok; через http-vhost к стеку:
  `/v1/health` ok, `/register` 200, `/admin` → 301 `/admin/`, `/admin/` 200, `/manifest.webmanifest` 200; POST с
  `Origin` своего хоста → 400 (валидация, CSRF пропустил), с чужим `Origin` → 403.
- `actionlint` 1.7.7 (docker) — 0 замечаний; `shellcheck` 0.10.0 (docker) — 0; `bash -n` — ok; YAML — парсится.
- `pnpm check` — EXIT 0; без кеша turbo `pnpm turbo run typecheck test --force` — EXIT 0, 16/16 задач (api 100 тестов).

**NOT VERIFIED:** реальный прогон workflow в GitHub (сборка в Actions, push в GHCR, pull `GITHUB_TOKEN`-ом на сервере),
nginx/certbot на сервере (sudo, IMDS, проба HTTP-01, выпуск для sslip.io) — на сервер не заходили по условию задачи;
первый деплой — оркестратор после слияния.
