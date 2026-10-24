# Dev-стенд: UI Mailpit по https://<хост>/mail/ под паролем

## 1. Title
Тестировщики открывают письма стенда (подтверждение e-mail) в браузере без SSH; наружу письма по-прежнему не уходят.

## 2. Goal
Убрать SSH-туннель из сценария «зарегистрировался → открыл письмо → перешёл по ссылке» для тестировщиков, не открывая
письма (а значит, ссылки подтверждения чужих аккаунтов стенда) без пароля.

## 3. Scope
- `infra/deploy/docker-compose.yml` — Mailpit: `MP_WEBROOT=/mail/`, `MP_UI_AUTH=dev:${MAILPIT_UI_PASSWORD}`.
- `infra/deploy/env.template` — `MAILPIT_UI_PASSWORD=@secret`.
- `infra/deploy/bootstrap.sh` — vhost: `location /mail/` (https), WebSocket; без сертификата `/mail/` → 404.
- `infra/deploy/deploy.sh` — smoke `/mail/`: без пароля 401, с паролем 200 (порт хоста и vhost).
- `.github/workflows/deploy-dev.yml` — ссылка на письма в Summary (только при https).
- `docs/runbooks/deploy.md` — раздел «Почта».

## 4. Out of Scope
- Relay/forward писем наружу, реальный SMTP-провайдер.
- Учётки тестировщиков по отдельности (один общий логин `dev`).
- Действия на сервере (первый деплой — оркестратор после слияния).

## 5. Решения
- **Auth — сам Mailpit** (`MP_UI_AUTH`, inline `user:password`; сверено по бинарю образа v1.31 и пробой: открытый
  текст принимается, `/mail/readyz`/`/mail/livez` без auth — healthcheck образа работает). Не nginx `auth_basic`:
  пароль защищает и туннель/порт хоста, файл htpasswd не нужен.
- **Пароль** — `@secret` шаблона: `openssl rand -hex 32` в `bootstrap.sh` на сервере, только если ключа нет, `.env` 600,
  в лог — только имя ключа. Hex — без `:`, пробелов и кавычек (безопасно для `MP_UI_AUTH` и конфига curl).
  Сменить — удалить ключ в `.env` и передеплоить.
- **Webroot `/mail/`** — UI и API Mailpit под тем же префиксом, nginx проксирует путь как есть. Маршрута `/mail` у
  web (`apps/app/src/app`) и API (`/v1`) нет — конфликта нет.
- **nginx:** `location = /mail` → 301 `/mail/`; `location /mail/` → `127.0.0.1:8125`, `Upgrade`/`Connection` для
  `/mail/api/events`, `proxy_read_timeout 1h`. `map $http_upgrade $onbike_mail_connection` — своё имя (map общий для
  всех сайтов сервера, `$connection_upgrade` мог быть у соседей → `nginx -t` упал бы на дубле). Заголовки
  `proxy_set_header` повторены в location (иначе не наследуются); `add_header` (X-Robots-Tag, HSTS) наследуются;
  `client_max_body_size` — общий server. Только в https-блоке; без сертификата — 404.
- **Smoke:** пароль читается из `.env` в переменную скрипта и идёт в curl через stdin (`-K -`): не в argv и не в лог.

## 8.2 Deviations from spec
- Сверх задачи: строка со ссылкой на письма в Summary `deploy-dev` (только при https, без пароля).
- http-режим (сертификата нет): `/mail/` явно → 404 (в постановке — «только https-блок»; явный 404 вместо отдачи в web).

## 8.3 Security checklist
1. **AuthN/AuthZ:** UI и API Mailpit — basic-auth (`dev` + 256-битный случайный пароль) на уровне самого Mailpit:
   и через nginx, и через порт `127.0.0.1:8125`. Доступ к письмам = доступ к ссылкам подтверждения любых аккаунтов
   стенда, поэтому без пароля — 401 (проверяется smoke каждого деплоя).
2. **Входные данные:** порт `ON_BIKE_MAIL_UI_PORT` валидируется как число; пароль — hex из `openssl rand`.
3. **Данные наружу:** UI — только по https (без сертификата 404: basic-auth не идёт открытым текстом);
   `X-Robots-Tag: noindex, nofollow`; письма наружу не уходят — `MP_SMTP_RELAY_*`/`MP_SMTP_FORWARD_*` не заданы.
4. **Злоупотребления:** rate-limit на basic-auth нет; перебор 256-битного пароля нереален. Пароль общий —
   смена при уходе тестировщика (runbook).
5. **Секреты и логи:** пароль генерируется и живёт только в `.env` сервера (600, каталог 700); не в git, GitHub,
   логе Actions и Summary. `MP_UI_AUTH` виден в `docker inspect` — только пользователям группы `docker` (= root
   сервера), тем же, кто читает `.env`. Mailpit в лог пишет только «enabling basic authentication».
6. **Аудит:** не требуется (dev-стенд, чтение писем); история изменений — прогоны `deploy-dev`.

## 9. Acceptance Criteria
1. Mailpit стека отвечает на `/mail/`: без пароля 401, с `dev:<MAILPIT_UI_PASSWORD>` 200; healthcheck `healthy`.
2. Пароль генерируется `bootstrap.sh` при отсутствии ключа, повторный деплой его не меняет, в выводе деплоя его нет.
3. Vhost (http и https) проходит `nginx -t` в nginx 1.24; через https-vhost `/mail/` 401/200, `/mail` → 301,
   WebSocket `/mail/api/events` → 101 (с паролем), `X-Robots-Tag` есть; через http-vhost `/mail/` → 404.
4. `deploy.sh` smoke проверяет 401/200 на порту хоста и через vhost; `shellcheck`, `bash -n`, `actionlint` чисто.
5. `pnpm check` EXIT 0.
6. Runbook «Почта»: адрес, логин, как узнать и сменить пароль, письма не уходят наружу, туннель — запасной путь.

## 12. Outcome

### Coder, 2026-10-24
**Проверки (локально, Docker Desktop arm64):**
- Mailpit v1.31 (образ из compose): `--webroot`, `--ui-auth-file`; env `MP_WEBROOT`, `MP_UI_AUTH`, `MP_UI_AUTH_FILE` есть в
  бинаре. С `MP_WEBROOT=/mail/` + `MP_UI_AUTH=dev:<пароль>`: `/mail/` 401 / 200 / неверный пароль 401, `/mail` → 302,
  `/mail/readyz` 200 без auth, healthcheck образа `healthy`.
- `deploy.sh` (`ON_BIKE_PROJECT=on-bike-mailtest ON_BIKE_SKIP_PULL=1 ON_BIKE_SKIP_NGINX=1`, образы `api`/`web`/`admin`
  собраны локально по `infra/docker/Dockerfile` с build secret) — два прогона EXIT 0: smoke `/mail/` 401/200 прошёл;
  `MAILPIT_UI_PASSWORD` создан в первом прогоне (64 hex), во втором тот же (сверка по хешу), строка одна; пароля нет в
  выводе деплоя; `.env` 600, каталог 700. Регистрация 201 → письмо в Mailpit (`/mail/api/v1/messages` с паролем) со
  ссылкой `https://<хост>/auth/verify/…`; «Release» → 400 (relay не настроен — письмо не отправлено). Стек снят
  `down -v`, образы удалены (контейнеров/томов/образов `on-bike-mailtest` — 0).
- Vhost из `bootstrap.sh` (http и https) + Mailpit — `nginx -t` в `ubuntu/nginx:1.24-24.04_beta` (nginx/1.24.0, с
  дефолтным сайтом Ubuntu): ok. https: `/mail/` 401 (`WWW-Authenticate: Basic`) / 200, неверный пароль 401, `/mail` →
  301 `/mail/`, `http://…/mail/` → 301 на https, WebSocket `/mail/api/events` с паролем → 101, без → 401;
  `X-Robots-Tag` и HSTS в ответах `/mail/`. http-vhost: `/mail/`, `/mail` → 404.
- `bash -n` — ok; `shellcheck` v0.10.0 — 0; `actionlint` 1.7.7 (deploy-dev.yml, ci.yml) — 0; `pnpm check` — EXIT 0.

**NOT VERIFIED:** реальный деплой на сервер (nginx/certbot хоста, соседние `map`), ветка ошибки smoke `/mail/`
(сообщение без пароля — по коду), открытие UI в браузере (WebSocket проверен curl-ом через nginx).
