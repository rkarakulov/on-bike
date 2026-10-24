# Findings — onbike-deploy-dev — pass 1 — reviewer: claude
base: origin/develop   commits: origin/develop..origin/feature/deploy-dev (7ae0908..0c41414, 4 коммита)
verdict: REQUEST CHANGES — фиксы pass 1: coder, 2026-10-24 (статусы у каждого пункта)

Проверено ревьюером сам: `bash -n` обоих скриптов — ok; `shellcheck` (koalaman/shellcheck:stable) — 0;
`actionlint` (rhysd/actionlint:latest) на deploy-dev.yml + ci.yml — 0; эксперимент nginx 1.24 (см. HIGH-1).
Репозиторий `rkarakulov/on-bike` — **PUBLIC** (`gh repo view`), это учтено в MEDIUM-2/3.

### [HIGH] `listen 443 ssl http2` включает HTTP/2 всем соседним сайтам на :443
- **status:** FIXED — `listen 443 ssl;` (без `http2`/`default_server`); `bootstrap.sh` после установки проверяет `nginx -T`, что on-bike не default для :80/:443 (иначе `::warning::`); runbook «nginx». Проверено: рендер vhost + `nginx -t` в nginx 1.24.
- **file:** infra/deploy/bootstrap.sh
- **location:** render_vhost, строка 125 (`listen 443 ssl http2;`)
- **problem:** в nginx < 1.25.1 (Ubuntu 24.04 = 1.24) параметр `http2` у `listen` относится к сокету
  `*:443`, а не к server-блоку: стоит одному vhost его указать — HTTP/2 по ALPN начинают отдавать все
  виртуальные серверы на этом адресе:порту, т. е. соседним сайтам сервера.
- **why_it_matters:** деплой молча меняет протокол чужих сайтов на общем сервере — прямое противоречие §8.3.6
  («Чужие ресурсы сервера не меняются») и требованию «никакого вреда соседям». Риск поломки соседей (поведение
  h2 у их бэкендов/клиентов, лимиты `http2_*`, long-polling/SSE) не оценён, а `nginx -t` это не ловит.
- **evidence:** воспроизведено в `nginx:1.24-alpine`: два server на `listen 443 ssl` («сосед») и
  `listen 443 ssl http2` («on-bike»), `nginx -t` ok; `curl --http2` к соседу → `http_version=2`. Контроль без
  блока on-bike → сосед `http_version=1.1`.
- **recommended_fix:** убрать `http2` из `listen` (dev-стенду HTTP/1.1 достаточно). Если h2 нужен — только
  после явной проверки, что все соседние 443-блоки уже `http2`, и с записью в runbook. Заодно (LOW) перед
  первым деплоем проверить, что on-bike не станет default-сервером `*:443` по алфавиту `sites-enabled`
  (`sudo nginx -T | grep -n 'listen.*443'`): иначе запросы без SNI/с чужим именем получат его сертификат.

### [MEDIUM] Секреты деплоя — уровня репозитория: ключ с root-доступом к общему серверу доступен любой ветке
- **status:** FIXED (код и документы) — `environment: dev` у `preflight` и `deploy` (build — только `GITHUB_TOKEN`, без environment); `DEV_PUBLIC_HOST` — `vars` окружения; runbook «Первичная настройка» п. 2–4 (`gh api … environments/dev`, Deployment branches = develop, `gh secret set … --env dev`, удаление repo-уровня); task.md §8.3.1. Создание Environment и перенос секретов — автор/оркестратор. Узкий sudoers — остаточный риск в §8.3.1.
- **file:** .github/workflows/deploy-dev.yml; docs/tasks/2026-10-24-onbike-deploy-dev/task.md
- **location:** deploy-dev.yml:41-42, 60-63, 160-165; task.md:71-73 (§8.3.1)
- **problem:** `DEV_SSH_KEY` — ключ пользователя `ubuntu` с sudo без пароля и группой `docker` (runbook:66),
  т. е. root на сервере соседей. Секрет репозитория отдаётся любому workflow любой ветки; «вне develop
  preflight падает» — проверка внутри того же файла, её снимает push ветки с изменённым workflow. §8.3.1 подаёт
  её как AuthZ-контроль — это неверно.
- **why_it_matters:** любой токен/агент с правом push (в т. ч. автономные агенты проекта) может одним коммитом в
  ветку выгрузить ключ и получить root на общем EC2 — вред соседям. Это главный барьер, и он отсутствует.
- **evidence:** `secrets.DEV_SSH_KEY` без `environment:` у джобов; защита ветки только `if [ "${GITHUB_REF}" !=
  "refs/heads/develop" ]` в preflight.
- **recommended_fix:** GitHub Environment `dev` с «Deployment branches: develop», секреты `DEV_SSH_*` — в него
  (из репозитория удалить), `environment: dev` у `deploy` (и у `preflight`, если он читает секреты). Обновить
  §8.3.1 и runbook («Первичная настройка»: `gh secret set --env dev …`). Желательно — отдельный пользователь
  деплоя с узким sudoers (nginx -t/reload, install в sites-*, certbot) вместо `ubuntu` с полным sudo.

### [MEDIUM] Логи контейнеров стенда при сбое уходят в публичный лог Actions
- **status:** FIXED — при сбое в лог только `compose ps` (сервис, состояние, статус/код выхода) и подсказка про SSH; логи приложений — только по SSH (runbook «Логи»). Заодно из лога убраны IP (DNS-проверка) и имена чужих vhost.
- **file:** infra/deploy/deploy.sh; .github/workflows/deploy-dev.yml
- **location:** deploy.sh:66-75 (`show_state` → `compose logs --tail 80 api worker web admin`), 76-81;
  deploy-dev.yml:209 (`… 2>&1 | tee deploy.log`)
- **problem:** репозиторий публичный — логи прогонов видит кто угодно. На любой ошибке деплоя/smoke в них
  выводятся по 80 строк логов api/worker/web, а ошибки БД (Drizzle `Failed query … params: …`) и стеки
  содержат e-mail/данные тестировщиков стенда.
- **why_it_matters:** AGENTS.md §4.8 и `.claude/rules/security.md` п. 5 — «ничего секретного и персонального в
  логах»; публичный лог — худший вариант утечки (не удаляется без ручной чистки прогонов).
- **evidence:** `gh repo view rkarakulov/on-bike --json visibility` → `PUBLIC`; deploy.sh:68.
- **recommended_fix:** в Actions выводить только `compose ps -a` и коды выхода/health, логи — смотреть по SSH
  (runbook «Логи» уже это описывает); либо писать логи в файл на сервере и печатать путь.

### [MEDIUM] Публичная документация раскрывает инвентарь чужих сервисов общего сервера
- **status:** FIXED — из deploy.md/task.md убраны адрес сервера, имена и порты соседей (в т. ч. в этой копии findings); `<сервер>` = секрет `DEV_SSH_HOST`. Дефолт хоста с IP убран из workflow — переменная обязательна. Остаток: прежние коммиты ветки (история; force-push запрещён) — task.md §8.
- **file:** docs/runbooks/deploy.md; docs/tasks/2026-10-24-onbike-deploy-dev/task.md
- **location:** deploy.md:18, 32-33; task.md:23-24
- **problem:** в публичный репозиторий коммитятся IP сервера вместе со списком соседних сервисов и
  картой их занятых портов [в этой копии скрыто].
- **why_it_matters:** это разведданные о чужой инфраструктуре (какие сервисы и на каких портах), которые
  соседи не публиковали; если какой-то из портов открыт в security group — готовая цель. Вред соседям без
  пользы для on-bike.
- **evidence:** указанные строки; репозиторий PUBLIC.
- **recommended_fix:** оставить в документах только свои порты (3100/8180/8181/8125) и формулировку «сервер
  общий, порты соседей не занимать — проверить `ss -ltnp` перед сменой»; имена и порты соседей убрать (в т. ч.
  из task.md до merge).

### [LOW] Без `DEV_SSH_KNOWN_HOSTS` ключ хоста не проверяется (TOFU на каждом прогоне)
- **status:** FIXED — `DEV_SSH_KNOWN_HOSTS` обязателен в preflight (ошибка с командами `ssh-keyscan` и `gh secret set --env dev`), `ssh-keyscan` из deploy убран.
- **file:** .github/workflows/deploy-dev.yml
- **location:** 171-177
- **problem:** `ssh-keyscan` в known_hosts + `StrictHostKeyChecking yes` = доверие первому ответившему; §8.3.1
  называет это «проверка ключа хоста включена».
- **why_it_matters:** MITM на пути runner → EC2 получит `GITHUB_TOKEN` (packages:read) со stdin. Ключ деплоя
  не утечёт (подпись привязана к сессии), поэтому LOW, но закрепление стоит одну команду.
- **evidence:** строка 175.
- **recommended_fix:** сделать `DEV_SSH_KNOWN_HOSTS` обязательным в preflight (как `DEV_SSH_KEY`), keyscan убрать.

### [LOW] `always()` в условии `deploy` — деплой нельзя отменить
- **status:** FIXED — `!cancelled() && …`.
- **file:** .github/workflows/deploy-dev.yml
- **location:** 146-149
- **problem:** с `always()` джоб запускается/продолжается и при отмене прогона (условие при cancel
  переоценивается и остаётся true).
- **why_it_matters:** нельзя остановить ушедший не туда деплой/откат кнопкой Cancel.
- **evidence:** `if: always() && needs.preflight.result == 'success' && (…)`.
- **recommended_fix:** `!cancelled() && needs.preflight.result == 'success' && (…)`.

### [LOW] Общий диск и память: нет ротации логов контейнеров; Redis `noeviction` без `maxmemory`
- **status:** FIXED — якорь `logging` (json-file, `max-size: 10m`, `max-file: 3`) у всех 8 сервисов (на сервере нет `daemon.json` — подтвердил оркестратор); Redis `--maxmemory 192mb` + `noeviction` (очереди BullMQ), лимит контейнера 320m (запас на fork AOF-rewrite).
- **file:** infra/deploy/docker-compose.yml
- **location:** все сервисы (нет `logging:`); строка 46
- **problem:** (1) json-file без `max-size` растёт без предела, если в `/etc/docker/daemon.json` сервера нет
  log-opts (не проверено); порог диска проверяется только в момент деплоя. (2) `--maxmemory-policy noeviction`
  без `--maxmemory` не действует — при росте Redis упрётся в лимит cgroup 256m и будет убит OOM, а не вернёт
  ошибку записи.
- **why_it_matters:** заполнение общего диска бьёт по соседям; OOM-kill Redis — потеря очереди до AOF-fsync.
- **evidence:** нет `logging:` в compose; `command: ['redis-server', '--appendonly', 'yes', '--maxmemory-policy', 'noeviction']`.
- **recommended_fix:** якорь `logging: { driver: local, options: { max-size: 10m, max-file: '3' } }` на все
  сервисы; Redis — `--maxmemory 200mb`.

### [LOW] Временный `DOCKER_CONFIG` прячет пользовательские CLI-плагины
- **status:** CLOSED (не дефект) — compose на сервере — системный плагин `/usr/libexec/docker/cli-plugins/docker-compose` (проверил оркестратор, read-only); `DOCKER_CONFIG` влияет только на `<config>/cli-plugins`, системные каталоги плагинов CLI ищет всегда.
- **file:** infra/deploy/deploy.sh
- **location:** 88-95
- **problem:** при `DOCKER_CONFIG=<tmp>` CLI ищет плагины в `<tmp>/cli-plugins`; если Compose v2 на сервере
  поставлен в `~/.docker/cli-plugins`, `compose pull` упадёт «'compose' is not a docker command».
- **why_it_matters:** первый реальный деплой упадёт (без вреда, но непроверенный путь — NOT VERIFIED у coder).
- **evidence:** путь pull с токеном не прогонялся (`ON_BIKE_SKIP_PULL=1` в проверке coder).
- **recommended_fix:** перед первым деплоем проверить `docker compose version` и расположение плагина
  (`/usr/libexec/docker/cli-plugins` — ok) или симлинкнуть `cli-plugins` во временный конфиг.

### [LOW] Прочее (по желанию)
- **status:** FIXED — certbot `--cert-name <хост>`; `X-Robots-Tag: noindex, nofollow` в vhost; smoke через vhost (`--resolve <хост>:443:127.0.0.1` при https, `Host:` на :80 при http); `NODE_AUTH_TOKEN` с `packages: write` — принятый риск в task.md §8.3.5 (read-only токена в джобе с push нет).
- **file:** infra/deploy/bootstrap.sh; .github/workflows/deploy-dev.yml
- **location:** bootstrap.sh:274-276, 148-180; deploy-dev.yml:113, 127, 139
- **problem / recommended_fix:**
  - certbot без `--cert-name "${PUBLIC_HOST}"`: при коллизии lineage certbot создаст `<host>-0001`, а
    `cert_present` смотрит только `live/<host>` — vhost останется на http. Добавить `--cert-name`.
  - публичный dev-стенд индексируется: добавить в vhost `add_header X-Robots-Tag "noindex, nofollow" always;`.
  - `NODE_AUTH_TOKEN` в build — это `GITHUB_TOKEN` с `packages: write`; он в окружении lifecycle-скриптов
    `allowBuilds` (esbuild, @swc/core, msgpackr-extract, unrs-resolver) при `pnpm install`. Риск supply-chain
    (публикация подменённых образов on-bike-*) смягчён `minimumReleaseAge`; отметить в §8.3.5.
  - smoke только по портам хоста — vhost nginx после деплоя не проверяется; можно добавить
    `curl -fsS -H "Host: ${PUBLIC_HOST}" http://127.0.0.1/v1/health`.

## Измерения без замечаний
- correctness ci.yml как reusable: `workflow_call`, permissions вызывающего (contents/packages/pull-requests: read)
  покрывают gitleaks и install; группы concurrency разведены `github.workflow` (в вызванном — имя вызывающего).
- миграции: одноразовый `migrate` до `up`, не при старте; откат на старый тег — drizzle применяет только
  недостающие (no-op).
- секреты: токен GHCR — stdin, не в argv/env удалённой команды, временный DOCKER_CONFIG + logout + rm + trap EXIT;
  `.env` 600 в каталоге 700, `umask 077`, в лог только имена ключей; `printf %q` для удалённых параметров;
  `DEV_PUBLIC_HOST`/`image_tag` валидируются до использования; `${{ }}` в `run` — только `github.actor`,
  `event_name`, `job.status` (безопасный алфавит). `NODE_AUTH_TOKEN` — secret mount, `~/.npmrc` со ссылкой на
  переменную удаляется в том же RUN; runtime-стадии с чистой базы; `.dockerignore` исключает `.git` (в т. ч.
  токен checkout в `.git/config`), `.env*`, ключи.
- общий сервер: свой server_name, не default_server, `nginx -t` + откат своего файла, reload только при
  изменении; certbot webroot; prune строго по label; свой compose project/тома; порты 127.0.0.1; flock +
  concurrency без отмены.
- TRUST_PROXY=1 + `X-Forwarded-For $remote_addr`: api-kit `trustProxy: (_, hop) => hop < 1` берёт адрес,
  записанный nginx, подделка не проходит. CORS пусто + CSRF Fetch Metadata/Host — same-origin работает.
- Dockerfile: многоступенчатый, digest базовых образов, non-root (node/101); runtime-deps — замыкание
  dependencies + установленных optional (нативные `@node-rs/argon2-linux-x64-gnu`, esbuild) — платформа сборки и
  runtime одна (bookworm amd64).
- admin `base` из `ADMIN_BASE` (по умолчанию `/`, Caddy-прод не затронут); роутера в admin нет, API — `baseUrl: ''`.
- Documentation Sync: deploy.md и README обновлены по §10.
- i18n / дизайн-система / состояния данных / платформы — изменение инфраструктурное, UI не затронут.

## NOT VERIFIED
- Сборка и прогон стека (AC1–AC3) ревьюером не повторялись (amd64-эмуляция, долго) — опираюсь на Outcome coder.
- Реальный GitHub-прогон, pull GHCR `GITHUB_TOKEN`-ом, nginx/certbot/IMDS на сервере, daemon.json log-opts,
  расположение compose-плагина — на сервер не заходили.
