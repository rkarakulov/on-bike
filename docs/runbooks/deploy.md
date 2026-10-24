# Деплой dev-стенда

Когда применять: первичная настройка автодеплоя, смена домена, разбор упавшего деплоя, откат, логи и почта стенда.

**dev = ветка `develop`** — каждый push в `develop` разворачивает стенд автоматически. **prod = `main`** — свой
workflow и сервер позже (не настроен; `infra/docker-compose.prod.yml` с Caddy — заготовка под VPS).

Обозначения: `<сервер>` — адрес сервера из секрета `DEV_SSH_HOST` окружения `dev` (в репозитории не пишется);
`<хост>` — публичное имя стенда, переменная `DEV_PUBLIC_HOST` окружения `dev`. Репозиторий публичный: адрес сервера,
чужие сервисы на нём и логи приложений в документы и лог Actions не попадают.

## Схема

```
push develop ─► deploy-dev.yml
                 ├─ preflight   environment dev: секреты DEV_SSH_*, DEV_PUBLIC_HOST, тег sha-<7>
                 ├─ ci          ci.yml (reusable): format, lint, arch, typecheck, test, сборка, web-смоук
                 ├─ build       infra/docker/Dockerfile → GHCR: on-bike-api, on-bike-web, on-bike-admin
                 │              теги sha-<7> и develop, linux/amd64
                 └─ deploy      environment dev; SSH: файлы стека → ~/on-bike, deploy.sh (токен GHCR — stdin)

Сервер — общий (на нём живут другие проекты: их сайты, контейнеры, тома и порты не трогаем):
  nginx хоста :80/:443 ─ /etc/nginx/sites-available/on-bike (server_name = <хост>)
     /v1/*     → 127.0.0.1:3100  api      (NestJS)
     /admin/*  → 127.0.0.1:8181  admin    (статика, nginx без root)
     /mail/*   → 127.0.0.1:8125  mailpit  (UI писем, basic-auth; только при https)
     /         → 127.0.0.1:8180  web      (SSR, expo-server)
  compose project on-bike-dev (~/on-bike/docker-compose.yml, .env):
     worker, postgres (PostGIS), redis — без портов хоста; mailpit — UI 127.0.0.1:8125, SMTP только внутри
```

`deploy.sh` на каждом деплое: `bootstrap.sh` (каталог, `.env`, vhost, сертификат) → pull → postgres/redis/mailpit →
**миграции одноразовым контейнером** (`compose run --rm migrate`) → api/worker/web/admin с ожиданием healthcheck →
smoke (`/v1/health` = ok, `/register`, `/admin/`, `/mail/` без пароля 401 и с паролем 200, `/v1/health` и `/mail/`
через vhost nginx) → прочистка образов on-bike без
контейнеров (по label `by.on-bike.project=on-bike`, чужие образы не трогаются).

Свои порты хоста — 3100, 8180, 8181, 8125, только `127.0.0.1`; выбраны свободными. Менять — после `sudo ss -ltnp` на
сервере. Лимиты памяти контейнеров — в `infra/deploy/docker-compose.yml` (всего ≤ 2,5 ГБ), логи контейнеров
ротируются (json-file, 3 × 10 МБ на контейнер).

## Первичная настройка (один раз)

1. **SSH-ключ деплоя** — отдельная пара, публичная часть — в `~ubuntu/.ssh/authorized_keys` сервера:

   ```bash
   ssh-keygen -t ed25519 -N '' -C on-bike-deploy -f ~/.ssh/on-bike-deploy
   ssh-copy-id -i ~/.ssh/on-bike-deploy.pub ubuntu@<сервер>
   ```

2. **GitHub Environment `dev`** — секреты деплоя получают только джобы `environment: dev` на ветке `develop`:

   ```bash
   # окружение с правилом Deployment branches = develop
   gh api -X PUT repos/rkarakulov/on-bike/environments/dev \
     -F 'deployment_branch_policy[protected_branches]=false' -F 'deployment_branch_policy[custom_branch_policies]=true'
   gh api -X POST repos/rkarakulov/on-bike/environments/dev/deployment-branch-policies -f name=develop -f type=branch
   ```

   (то же в UI: Settings → Environments → New environment `dev` → Deployment branches and tags → Selected → `develop`.)

3. **Секреты и переменные окружения `dev`** (значения — из файла/stdin, не печатаются):

   ```bash
   printf '%s' '<сервер>' | gh secret set DEV_SSH_HOST --env dev
   gh secret set DEV_SSH_KEY --env dev < ~/.ssh/on-bike-deploy
   ssh-keyscan -t ed25519 <сервер> > /tmp/on-bike-known-hosts   # сверить отпечаток с сервером:
   #   ssh ubuntu@<сервер> ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
   gh secret set DEV_SSH_KNOWN_HOSTS --env dev < /tmp/on-bike-known-hosts
   gh variable set DEV_PUBLIC_HOST --env dev --body '<хост>'
   # необязательно: e-mail для Let's Encrypt (уведомления об истечении); пользователь SSH, если не ubuntu
   gh variable set DEV_CERTBOT_EMAIL --env dev --body '<e-mail>'
   gh variable set DEV_SSH_USER --env dev --body 'ubuntu'
   ```

   Все четыре — `DEV_SSH_HOST`, `DEV_SSH_KEY`, `DEV_SSH_KNOWN_HOSTS`, `DEV_PUBLIC_HOST` — обязательны: без них preflight
   падает с этим списком команд. `DEV_PUBLIC_HOST` не должен совпадать со значением секрета (GitHub отбросит выход
   preflight с хостом — build упадёт с подсказкой).

4. **Убрать уровень репозитория.** Секреты репозитория видны любому workflow любой ветки — после переноса удалить:

   ```bash
   gh secret delete DEV_SSH_HOST; gh secret delete DEV_SSH_KEY; gh secret delete DEV_SSH_KNOWN_HOSTS
   gh variable delete DEV_PUBLIC_HOST
   gh secret list; gh secret list --env dev   # на уровне репозитория DEV_* не осталось
   ```

5. **Пакеты `@rkarakulov/*`** уже открыты репозиторию для CI (local-dev.md, «CI и сборки») — сборка образов читает их
   тем же `GITHUB_TOKEN` (build secret, в слои не попадает). Образы `on-bike-*` в GHCR создаются первым деплоем,
   приватные, привязаны к репозиторию (label `org.opencontainers.image.source`) — отдельного доступа не нужно.
6. **DNS.** Временный хост — `pokatim-dev.<IP сервера через дефисы>.sslip.io`: wildcard-DNS sslip.io сам резолвит его в
   IP. Постоянный домен `pokatim-dev.limedolphin.com` — A-запись на IP сервера, затем «Смена домена».

На сервере вручную ничего не готовится: каталог `~/on-bike`, `.env` с секретами, vhost и сертификат создаёт первый
деплой. Предусловия (уже есть): Docker + Compose v2 (системный плагин), nginx, certbot, `ubuntu` в группе `docker` и
с sudo без пароля.

## Запуск

- **Автоматически:** push (merge PR) в `develop`. CI для push в `develop` идёт внутри `deploy-dev` (отдельного прогона
  `ci` на push нет); PR в `develop` проверяет `ci` (`pull_request`).
- **Вручную:** Actions → `deploy-dev` → Run workflow, ветка `develop`. Кнопка видна в UI, только когда
  `deploy-dev.yml` есть на default-ветке репозитория (сейчас `main`). До этого — `gh workflow run deploy-dev.yml --ref
  develop [-f image_tag=sha-…]` (GitHub принимает, если workflow уже регистрировался push-ем в `develop`) или новый push
  в `develop`.
- Поле `image_tag` пусто — CI, сборка и деплой текущего `develop`; задано — деплой уже собранного тега (откат).
- Итог — Summary прогона: тег, адреса, https или http. Cancel прогона останавливает и деплой.

## `.env` сервера

`~/on-bike/.env` (600) создаёт `bootstrap.sh` по `infra/deploy/env.template`:

- `POSTGRES_PASSWORD`, `JWT_SECRET`, `EMAIL_TOKEN_SECRET`, `MAILPIT_UI_PASSWORD` — генерируются на сервере
  (`openssl rand -hex 32`) при первом деплое (новый ключ — при первом деплое после его появления в шаблоне); в лог,
  git и GitHub не попадают; повторные деплои их не меняют.
- Недостающие ключи шаблона дописываются, существующие значения не трогаются (правка руками сохраняется).
  Исключение — `MAIL_FROM`, равный прежнему умолчанию `'on-bike dev <…>'`: заменяется на текущее из шаблона
  (бренд «Покатим», `docs/product/brand.md`); своё значение остаётся.
- `PUBLIC_HOST`, `WEB_ORIGIN` (`https://<хост>`), `APP_LINK_BASE` (`https://<хост>/`), `ON_BIKE_TAG` — **всегда** из
  деплоя (переменная окружения `dev` и тег).
- `CORS_ORIGINS` пусто (web и API — один origin за nginx), `TRUST_PROXY=1` (один прокси — nginx хоста; он
  перезаписывает `X-Forwarded-For` адресом клиента).

Потеря `.env` при живом томе `pgdata`: новый `POSTGRES_PASSWORD` не совпадёт с паролем в базе. Восстановить файл из
бэкапа или пересоздать стенд (`down -v` — данные dev теряются, только с согласия автора).

## nginx

Свой файл `/etc/nginx/sites-available/on-bike` + ссылка в `sites-enabled`; перед reload — `nginx -t`, при ошибке
откатывается только свой файл. Чужие сайты не меняются:

- `listen 443 ssl;` без `http2` и без `default_server`: в nginx 1.24 (Ubuntu 24.04) параметры `listen` действуют на
  весь сокет `*:443` — `http2` включил бы HTTP/2 соседним сайтам.
- Сервер по умолчанию для порта (запросы без SNI/с чужим `Host`) — блок с `default_server`, иначе первый по порядку
  включения (`sites-enabled` — по алфавиту). `bootstrap.sh` после установки проверяет `nginx -T`: если по умолчанию для
  :80 или :443 оказался `on-bike` — `::warning::` в логе (деплой ничего не меняет у соседей). Проверить вручную:
  `sudo nginx -T | grep -nE '^# configuration file|listen'` — первым с `listen 443`/`listen 80` (или с
  `default_server`) должен быть не `on-bike`. Если всё же он — согласовать с владельцами сервера явный
  `default_server` у их сайта; переименовывать свой файл «в конец алфавита» — крайняя мера (имя меняет и откат).
- Dev-стенд отдаёт `X-Robots-Tag: noindex, nofollow` — поисковики его не индексируют.
- `/mail/` (UI Mailpit) — только в https-блоке, с WebSocket (`map $http_upgrade $onbike_mail_connection` — своё имя
  переменной: `map` общий для всех сайтов сервера). Без сертификата `/mail/` → 404.

## TLS

Сертификат Let's Encrypt выпускается `certbot certonly --webroot -w /var/www/html --cert-name <хост>` (тот же
webroot, что у соседних сайтов), только если домен ведёт на этот сервер: A-запись = публичный IP EC2 (IMDSv2) или
проба HTTP-01 через этот nginx прошла. Продление — штатный `certbot renew` (таймер certbot) с
`--deploy-hook 'systemctl reload nginx'`.

Нет DNS, лимит Let's Encrypt (sslip.io — общий домен), ошибка certbot — **деплой не падает**: vhost только на :80,
`::warning::` в логе и строка в Summary; следующий деплой пробует снова. Адреса в лог не выводятся; сверить DNS —
`dig +short <хост>` против IP сервера. **До сертификата web-сессия не работает:** refresh-cookie `__Secure-onbike_rt`
браузер принимает только по https, клиентский бандл ходит на `https://<хост>` (`EXPO_PUBLIC_API_URL` вшит при
сборке). API (`/v1/health`) и админка открываются и по http.

## Смена домена

1. A-запись нового домена → IP сервера (проверить: `dig +short pokatim-dev.limedolphin.com`).
2. `gh variable set DEV_PUBLIC_HOST --env dev --body 'pokatim-dev.limedolphin.com'`.
3. Деплой (push в `develop` или ручной запуск **без** `image_tag`: образ web пересобирается — адрес API вшит в бандл).

Деплой перепишет vhost `on-bike` на новый `server_name`, выпустит сертификат, выставит `PUBLIC_HOST`/`WEB_ORIGIN`/
`APP_LINK_BASE`; секреты и данные не меняются. Старый сертификат остаётся (предупреждение в логе) — удалить:
`ssh ubuntu@<сервер> sudo certbot delete --cert-name <старый хост>`. Ссылки из уже отправленных писем ведут на
старый хост.

## Логи, почта, состояние

В лог Actions деплой при сбое выводит только состояние контейнеров (`compose ps`) и коды выхода — логи приложений
могут содержать персональные данные тестировщиков, их смотрят только по SSH. Вывод миграций каждого деплоя —
в `~/on-bike/migrate.log` на сервере (права 600, перезаписывается), в Actions — только код выхода:

```bash
ssh ubuntu@<сервер>
cd ~/on-bike
alias dc='docker compose -p on-bike-dev -f docker-compose.yml --env-file .env'
dc ps -a
dc logs -f --tail 200 api worker
dc logs --tail 200 web admin
cat migrate.log                              # вывод миграций последнего деплоя (в Actions — только код выхода)
dc run --rm migrate                          # повторить миграции вручную (вывод — в терминал)
curl -s http://127.0.0.1:3100/v1/health      # version = развёрнутый тег
```

PostgreSQL/Redis — только изнутри: `dc exec postgres psql -U on_bike on_bike`, `dc exec redis redis-cli`.

## Почта

Письма стенда (подтверждение e-mail и др.) ловит Mailpit: **наружу они не уходят** — relay и forward не настроены,
выпуск письма («Release») из UI недоступен.

- **Открыть:** `https://<хост>/mail/`, логин `dev` (basic-auth самого Mailpit; без пароля — 401). Ссылка — и в Summary
  прогона `deploy-dev`. Только по https: пока сертификата нет, `/mail/` → 404 (пароль не идёт открытым текстом).
- **Пароль** — `MAILPIT_UI_PASSWORD` в `.env` сервера (генерирует деплой, в git/GitHub/лог не попадает):

  ```bash
  ssh ubuntu@<сервер> 'grep ^MAILPIT_UI_PASSWORD= ~/on-bike/.env'
  ```

  Передавать тестировщикам — личным сообщением, не в общие каналы и не в issue/PR (репозиторий публичный).
- **Сменить** (утёк, ушёл тестировщик) — удалить ключ и передеплоить (ручной запуск `deploy-dev` с текущим
  `image_tag` или push в `develop`): деплой сгенерирует новый и пересоздаст контейнер mailpit.

  ```bash
  ssh ubuntu@<сервер> "sed -i '/^MAILPIT_UI_PASSWORD=/d' ~/on-bike/.env"
  ```

  Свой пароль — вписать `MAILPIT_UI_PASSWORD=<значение>` в `.env` (только `[A-Za-z0-9]`: значение уходит в
  `MP_UI_AUTH` как `dev:<пароль>` и в конфиг curl smoke) и передеплоить.
- **Доступ к письмам = доступ к чужим аккаунтам стенда** (ссылки подтверждения): пароль обязателен, UI не открывать
  без него.
- **Запасной путь** (нет https, проверка без nginx) — SSH-туннель к порту хоста, тот же логин и пароль:

  ```bash
  ssh -N -L 8125:127.0.0.1:8125 ubuntu@<сервер>   # письма: http://127.0.0.1:8125/mail/
  ```

## Откат

Actions → `deploy-dev` → Run workflow, `image_tag` = прошлый тег `sha-<7>` (теги — в Summary прошлых прогонов или
GHCR → Packages → `on-bike-api`). CI и сборка пропускаются, разворачиваются образы этого тега (из GHCR; локальные
старые образы прочищаются).

- Миграции не откатываются (в Drizzle нет down): откат кода на версию до миграции работает, только если миграция
  обратно совместима. Деструктивные миграции — только с человеком (AGENTS.md §4.6).
- Образ web прошлого тега содержит адрес API того хоста, с которым собран: после смены домена откатываться только на
  сборки нового домена.

## Диск

Порог деплоя — 1,5 ГБ свободно (`MIN_FREE_MB`), иначе `::error::` без изменений на сервере. Освобождать только своё:
`docker image prune -af --filter label=by.on-bike.project=on-bike`. Чужие образы, тома и `docker system prune` —
нельзя (общий сервер).

## Проверка

- Summary прогона: «Статус: success», адреса.
- `https://<хост>/v1/health` → `{"status":"ok","version":"sha-…"}`.
- `/register` — форма регистрации (SSR), `/admin/` — панель «Протокол» со статусом API.
- `https://<хост>/mail/` без пароля → 401; с логином `dev` — UI Mailpit.
- Регистрация → письмо в Mailpit (`https://<хост>/mail/`) → ссылка `https://<хост>/auth/verify/…`.

## Убрать стенд

Только с согласия автора: `dc down -v` (тома данных удаляются), `sudo rm /etc/nginx/sites-enabled/on-bike
/etc/nginx/sites-available/on-bike && sudo nginx -t && sudo systemctl reload nginx`, `sudo certbot delete --cert-name
<хост>`, `rm -rf ~/on-bike`.
