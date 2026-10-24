# Деплой dev-стенда

Когда применять: первичная настройка автодеплоя, смена домена, разбор упавшего деплоя, откат, логи и почта стенда.

**dev = ветка `develop`** — каждый push в `develop` разворачивает стенд автоматически. **prod = `main`** — свой
workflow и сервер позже (не настроен; `infra/docker-compose.prod.yml` с Caddy — заготовка под VPS).

## Схема

```
push develop ─► deploy-dev.yml
                 ├─ preflight   секреты DEV_SSH_HOST / DEV_SSH_KEY, тег sha-<7>
                 ├─ ci          ci.yml (reusable): format, lint, arch, typecheck, test, сборка, web-смоук
                 ├─ build       infra/docker/Dockerfile → GHCR: on-bike-api, on-bike-web, on-bike-admin
                 │              теги sha-<7> и develop, linux/amd64
                 └─ deploy      SSH: файлы стека → ~/on-bike, deploy.sh (токен GHCR — stdin)

Сервер (общий EC2 13.61.174.165, Ubuntu 24.04; соседи — eradar, teammd, n8n):
  nginx хоста :80/:443 ─ /etc/nginx/sites-available/on-bike (server_name = DEV_PUBLIC_HOST)
     /v1/*     → 127.0.0.1:3100  api      (NestJS)
     /admin/*  → 127.0.0.1:8181  admin    (статика, nginx без root)
     /         → 127.0.0.1:8180  web      (SSR, expo-server)
  compose project on-bike-dev (~/on-bike/docker-compose.yml, .env):
     worker, postgres (PostGIS), redis — без портов хоста; mailpit — UI 127.0.0.1:8125, SMTP только внутри
```

`deploy.sh` на каждом деплое: `bootstrap.sh` (каталог, `.env`, vhost, сертификат) → pull → postgres/redis/mailpit →
**миграции одноразовым контейнером** (`compose run --rm migrate`) → api/worker/web/admin с ожиданием healthcheck →
smoke (`/v1/health` = ok, `/register`, `/admin/`) → прочистка образов on-bike без контейнеров (по label
`by.on-bike.project=on-bike`, чужие образы не трогаются).

Порты хоста 3100, 8180, 8181, 8125 выбраны вне занятых на сервере (3000, 3001, 5000, 5001, 5003, 5004, 5432, 5555,
6379, 8000, 8071, 9890). Лимиты памяти контейнеров — в `infra/deploy/docker-compose.yml` (всего ≤ 2,5 ГБ).

## Первичная настройка (один раз)

1. **SSH-ключ деплоя** — отдельная пара, публичная часть — в `~ubuntu/.ssh/authorized_keys` сервера:

   ```bash
   ssh-keygen -t ed25519 -N '' -C on-bike-deploy -f ~/.ssh/on-bike-deploy
   ssh-copy-id -i ~/.ssh/on-bike-deploy.pub ubuntu@13.61.174.165
   ```

2. **Секреты и переменные репозитория** (значения не печатаются, только из файла/stdin):

   ```bash
   gh secret set DEV_SSH_HOST --body '13.61.174.165'
   gh secret set DEV_SSH_KEY < ~/.ssh/on-bike-deploy
   # рекомендуется: закрепить ключ хоста (иначе ssh-keyscan на каждом деплое)
   ssh-keyscan -t ed25519 13.61.174.165 > /tmp/on-bike-known-hosts   # сверить отпечаток с сервером
   gh secret set DEV_SSH_KNOWN_HOSTS < /tmp/on-bike-known-hosts
   # публичный хост (по умолчанию в workflow — pokatim-dev.13-61-174-165.sslip.io)
   gh variable set DEV_PUBLIC_HOST --body 'pokatim-dev.13-61-174-165.sslip.io'
   # необязательно: e-mail для Let's Encrypt (уведомления об истечении); пользователь SSH, если не ubuntu
   gh variable set DEV_CERTBOT_EMAIL --body '<e-mail>'
   gh variable set DEV_SSH_USER --body 'ubuntu'
   ```

3. **Пакеты `@rkarakulov/*`** уже открыты репозиторию для CI (local-dev.md, «CI и сборки») — сборка образов читает их
   тем же `GITHUB_TOKEN` (build secret, в слои не попадает). Образы `on-bike-*` в GHCR создаются первым деплоем,
   приватные, привязаны к репозиторию (label `org.opencontainers.image.source`) — отдельного доступа не нужно.
4. **DNS.** Временный хост `pokatim-dev.13-61-174-165.sslip.io` резолвится в IP сервера сам (wildcard sslip.io).
   Постоянный домен `pokatim-dev.limedolphin.com` — A-запись на `13.61.174.165`, затем «Смена домена».

На сервере вручную ничего не готовится: каталог `~/on-bike`, `.env` с секретами, vhost и сертификат создаёт первый
деплой. Предусловия (уже есть): Docker + Compose v2, nginx, certbot, `ubuntu` в группе `docker` и с sudo без пароля.

## Запуск

- **Автоматически:** push (merge PR) в `develop`.
- **Вручную:** Actions → `deploy-dev` → Run workflow, ветка `develop`. Кнопка видна в UI, только когда
  `deploy-dev.yml` есть на default-ветке репозитория (сейчас `main`). До этого — `gh workflow run deploy-dev.yml --ref
  develop [-f image_tag=sha-…]` (GitHub принимает, если workflow уже регистрировался push-ем в `develop`) или новый push в
  `develop`.
- Поле `image_tag` пусто — CI, сборка и деплой текущего `develop`; задано — деплой уже собранного тега (откат).
- Итог — Summary прогона: тег, адреса, https или http.

## `.env` сервера

`~/on-bike/.env` (600) создаёт `bootstrap.sh` по `infra/deploy/env.template`:

- `POSTGRES_PASSWORD`, `JWT_SECRET`, `EMAIL_TOKEN_SECRET` — генерируются на сервере (`openssl rand -hex 32`) при первом
  деплое; в лог, git и GitHub не попадают; повторные деплои их не меняют.
- Недостающие ключи шаблона дописываются, существующие значения не трогаются (правка руками сохраняется).
- `PUBLIC_HOST`, `WEB_ORIGIN` (`https://<хост>`), `APP_LINK_BASE` (`https://<хост>/`), `ON_BIKE_TAG` — **всегда** из
  деплоя (repo variable и тег).
- `CORS_ORIGINS` пусто (web и API — один origin за nginx), `TRUST_PROXY=1` (один прокси — nginx хоста; он
  перезаписывает `X-Forwarded-For` адресом клиента).

Потеря `.env` при живом томе `pgdata`: новый `POSTGRES_PASSWORD` не совпадёт с паролем в базе. Восстановить файл из
бэкапа или пересоздать стенд (`down -v` — данные dev теряются, только с согласия автора).

## TLS

Сертификат Let's Encrypt выпускается `certbot certonly --webroot -w /var/www/html` (тот же webroot, что у соседних
сайтов), только если домен ведёт на этот сервер: A-запись = публичный IP EC2 или проба HTTP-01 через этот nginx
прошла. Продление — штатный `certbot renew` (таймер certbot) с `--deploy-hook 'systemctl reload nginx'`.

Нет DNS, лимит Let's Encrypt (sslip.io — общий домен), ошибка certbot — **деплой не падает**: vhost только на :80,
`::warning::` в логе и строка в Summary; следующий деплой пробует снова. **До сертификата web-сессия не работает:**
refresh-cookie `__Secure-onbike_rt` браузер принимает только по https, клиентский бандл ходит на `https://<хост>`
(`EXPO_PUBLIC_API_URL` вшит при сборке). API (`/v1/health`) и админка открываются и по http.

## Смена домена

1. A-запись нового домена → `13.61.174.165` (проверить: `dig +short pokatim-dev.limedolphin.com`).
2. `gh variable set DEV_PUBLIC_HOST --body 'pokatim-dev.limedolphin.com'`.
3. Деплой (push в `develop` или ручной запуск **без** `image_tag`: образ web пересобирается — адрес API вшит в бандл).

Деплой перепишет vhost `on-bike` на новый `server_name`, выпустит сертификат, выставит `PUBLIC_HOST`/`WEB_ORIGIN`/
`APP_LINK_BASE`; секреты и данные не меняются. Старый сертификат остаётся (предупреждение в логе) — удалить:
`ssh ubuntu@13.61.174.165 sudo certbot delete --cert-name pokatim-dev.13-61-174-165.sslip.io`.
Ссылки из уже отправленных писем ведут на старый хост.

## Логи, почта, состояние

```bash
ssh ubuntu@13.61.174.165
cd ~/on-bike
alias dc='docker compose -p on-bike-dev -f docker-compose.yml --env-file .env'
dc ps
dc logs -f --tail 200 api worker
dc logs --tail 200 web admin
curl -s http://127.0.0.1:3100/v1/health      # version = развёрнутый тег
```

Почта (Mailpit) и прямой доступ к сервисам — SSH-туннель, наружу порты не открыты:

```bash
ssh -N -L 8125:127.0.0.1:8125 ubuntu@13.61.174.165   # письма: http://127.0.0.1:8125
```

PostgreSQL/Redis — только изнутри: `dc exec postgres psql -U on_bike on_bike`, `dc exec redis redis-cli`.

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
- `https://pokatim-dev.13-61-174-165.sslip.io/v1/health` → `{"status":"ok","version":"sha-…"}`.
- `/register` — форма регистрации (SSR), `/admin/` — панель «Протокол» со статусом API.
- Регистрация → письмо в Mailpit (туннель) → ссылка `https://<хост>/auth/verify/…`.

## Убрать стенд

Только с согласия автора: `dc down -v` (тома данных удаляются), `sudo rm /etc/nginx/sites-enabled/on-bike
/etc/nginx/sites-available/on-bike && sudo nginx -t && sudo systemctl reload nginx`, `sudo certbot delete --cert-name
<хост>`, `rm -rf ~/on-bike`.
