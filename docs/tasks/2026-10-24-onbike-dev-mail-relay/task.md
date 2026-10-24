# Dev-стенд: реальная доставка писем разрешённым адресам (relay Mailpit → SMTP)

## 1. Title
Письма стенда разрешённым получателям уходят в настоящие ящики (Amazon SES; временно — Gmail), все письма
по-прежнему видны в `https://<хост>/mail/`.

## 2. Goal
Тестировщики получают письма подтверждения в свои ящики, не открывая Mailpit; остальные адреса (чужие, случайные,
выдуманные) наружу не уходят.

## 3. Scope
- `infra/deploy/env.template` — `MAIL_RELAY_HOST`/`MAIL_RELAY_PORT` (SES eu-north-1:587), пустые
  `MAIL_RELAY_USERNAME`/`MAIL_RELAY_PASSWORD`; `MAIL_FROM` → `'Покатим dev <no-reply@limedolphin.com>'`.
- `infra/deploy/bootstrap.sh` — `mailpit-relay.yml` из `.env`, управляемые ключи `MAIL_RELAY_MATCHING`,
  `MAILPIT_RELAY_MATCHING`, `MAILPIT_RELAY_REV`; `migrate_mail_from` — два прежних умолчания.
- `infra/deploy/docker-compose.yml` — Mailpit: `MP_SMTP_RELAY_CONFIG` (файл), `MP_SMTP_RELAY_MATCHING`.
- `infra/deploy/deploy.sh` — smoke: состояние relay в Mailpit совпадает с решением bootstrap.
- `.github/workflows/deploy-dev.yml` — `DEV_MAIL_RELAY_MATCHING`: проверка в preflight, передача на сервер, Summary.
- `docs/runbooks/deploy.md` — «Почта» (Gmail и SES: включить, проверить, выключить), `.env`, первичная настройка.

## 4. Out of Scope
- Изменения API/worker (SMTP_URL по-прежнему `smtp://mailpit:1025`).
- Действия в AWS/Google/DNS и на сервере — автор (runbook).
- Хранилище Mailpit на томе (письма теряются при пересоздании контейнера, как и раньше).

## 5. Решения
- **Механизм — штатный auto-relay Mailpit v1.31.6** (сверено по `--help` образа и исходнику тега `v1.31.6`:
  `cmd/root.go`, `config/validators.go`, `internal/smtpd/relay.go`): `MP_SMTP_RELAY_MATCHING` — копия письма уходит
  только адресатам, совпавшим с регуляркой (RE2); `relay all` не используется (при нём matching игнорируется).
  Письмо всегда сохраняется в Mailpit; ошибка relay — только в логе mailpit (`forward-smtp-errors` выключен), API не
  страдает. Matching требует relay-конфига (иначе Mailpit не стартует) — поэтому оба передаются только вместе.
- **Креды — файлом, не env:** `MP_SMTP_RELAY_CONFIG=/etc/mailpit/relay.yml` (bind `~/on-bike/mailpit-relay.yml`, 600,
  `create_host_path: false`). YAML пишет `bootstrap.sh` (значения в одинарных кавычках) из `.env`: host, port,
  `starttls: true`, `allow-insecure: false`, `auth: plain`, username, password, `allowed-recipients` = та же регулярка
  (ограничивает и ручной «Release» из UI). Файл есть всегда (выключено — комментарий без значений).
- **Включение:** регулярка + логин + пароль непусты → `MAILPIT_RELAY_MATCHING` = регулярка, иначе пусто;
  compose: `MP_SMTP_RELAY_CONFIG: ${MAILPIT_RELAY_MATCHING:+/etc/mailpit/relay.yml}`. Выключено — деплой не падает,
  одна строка лога `почта: relay выключен (нет <ключи>)`.
- **Пересоздание:** `MAILPIT_RELAY_REV` (16 hex sha256 файла) → env `ONBIKE_RELAY_REV` контейнера: смена кредов или
  хоста пересоздаёт mailpit (bind файла иначе держал бы старый inode).
- **Регулярка:** `DEV_MAIL_RELAY_MATCHING` (переменная окружения `dev`) → `MAIL_RELAY_MATCHING=%q` в remote_env →
  `bootstrap.sh` → `.env` в одинарных кавычках (compose не подставляет `$`). Задана (даже пустая) — перезаписывает,
  не задана (ручной `deploy.sh`) — остаётся прежняя. Проверка (preflight и bootstrap): пусто или ≤ 512, есть `@`,
  без кавычек, `` ` ``, пробелов и управляющих символов. В лог Actions значение не выводится.
- **Провайдер-нейтрально:** хост/порт — ключи `.env` (умолчание SES), bootstrap дописывает и не перезаписывает;
  Gmail — `smtp.gmail.com:587` + App Password, `MAIL_FROM` = адрес ящика (ручное значение).
- **MAIL_FROM:** `migrate_mail_from` заменяет только `'on-bike dev <no-reply@on-bike.by>'` и
  `'Покатим dev <no-reply@on-bike.by>'`; ручные значения не трогаются.
- **Smoke:** `GET /mail/api/v1/webui` (с паролем UI через stdin curl) — `MessageRelay.Enabled` равен решению
  bootstrap; тело ответа не выводится (в нём регулярка).

## 8.2 Deviations from spec
- Сверх задачи: строка состояния relay в Summary `deploy-dev`; smoke состояния relay; `allowed-recipients` = регулярка
  (ограничение ручного «Release»).
- `MAIL_RELAY_HOST` должен быть FQDN (с точкой) — проверка в bootstrap.

## 8.3 Security checklist
1. **AuthN/AuthZ:** UI/API Mailpit — basic-auth, как раньше. Relay включается только автором: креды — руками в `.env`
   сервера, регулярка — переменная окружения `dev` (права на репозиторий). Ручной «Release» из UI ограничен той же
   регуляркой (`allowed-recipients`).
2. **Входные данные:** регулярка — проверка в preflight и bootstrap (длина, `@`, без кавычек/пробелов/переводов
   строк); невалидный RE2 — Mailpit не стартует, деплой падает на `--wait`. Хост — FQDN, порт 1–65535, логин/пароль —
   без пробелов и управляющих символов; в YAML — одинарные кавычки с удвоением `'`.
3. **Данные наружу:** наружу — только адресатам из регулярки (якоря `^…$` — в runbook); STARTTLS обязателен,
   сертификат проверяется (`allow-insecure: false`; проверено: чужой CA → `x509: certificate signed by unknown
   authority`, письмо не ушло). Регулярка (адреса тестировщиков) не выводится в лог Actions и Summary.
4. **Злоупотребления:** отправка наружу ограничена регуляркой; лимиты провайдера (SES sandbox 200/сутки, Gmail ~500)
   — ошибка только в логе mailpit.
5. **Секреты и логи:** логин/пароль SMTP — только `.env` (600) и `mailpit-relay.yml` (600) сервера; не в git, GitHub,
   argv (`printf` — builtin), env контейнера и `docker inspect` (проверено), логе. Креды не передавать в мессенджерах —
   вписывать сразу в `.env` сервера (runbook). Mailpit логирует host:port и регулярку (лог сервера, по SSH).
   Остаточный риск: root/группа `docker` сервера читает файл и `.env` — те же, кто читает остальные секреты.
6. **Аудит:** не требуется (dev); включение/выключение — прогоны `deploy-dev` и Summary.

## 9. Acceptance Criteria
1. Без логина/пароля или регулярки relay выключен: деплой зелёный, одна строка `relay выключен`, Mailpit
   `MessageRelay.Enabled=false`, письма только в Mailpit.
2. С логином, паролем и регуляркой: письмо на разрешённый адрес доходит до внешнего SMTP (STARTTLS + PLAIN), на
   неразрешённый — нет; оба видны в Mailpit стека.
3. Пароль SMTP не виден в `docker inspect`, argv и выводе деплоя.
4. Смена кредов пересоздаёт mailpit; повторный деплой без изменений — нет.
5. `MAIL_FROM` с прежними умолчаниями `@on-bike.by` заменяется на `@limedolphin.com`, ручное значение остаётся.
6. Невалидная регулярка — ошибка preflight/bootstrap без вывода значения.
7. `shellcheck`, `bash -n`, `actionlint`, `pnpm check` — чисто.
8. Runbook «Почта»: Gmail и SES (DNS, креды, sandbox), где вписать, `gh variable set`, проверка, выключение.

## 12. Outcome

### Coder, 2026-10-24
**Проверки (локально, Docker Desktop arm64):**
- Mailpit v1.31.6: имена `MP_SMTP_RELAY_*`, поля YAML и поведение matching/relay-all — по `--help` и исходнику тега.
- `deploy.sh` (`ON_BIKE_PROJECT=onbike-relaytest ON_BIKE_SKIP_PULL=1 ON_BIKE_SKIP_NGINX=1`, свои порты, образы
  api/web/admin собраны локально; в копии compose для теста — только CA тестового «SES» через `SSL_CERT_FILE`).
  «SES» — второй Mailpit (`MP_SMTP_AUTH`, `MP_SMTP_REQUIRE_STARTTLS`, сертификат от тестового CA) в сети проекта:
  1. первый деплой без кредов — EXIT 0, `relay выключен (нет MAIL_RELAY_MATCHING MAIL_RELAY_USERNAME
     MAIL_RELAY_PASSWORD)`, `Enabled=false`; ключи MAIL_RELAY_* дописаны;
  2. креды + `MAIL_RELAY_MATCHING='^allowed@example\.com$'` — EXIT 0, `relay включён`, smoke `Enabled=true`;
     письма `allowed@example.com`, `other@example.com`, `xallowed@example.com.evil`: в Mailpit стека — все три,
     в «SES» — только `allowed@example.com`; регулярка с `\.` и `$` дошла до Mailpit без искажений;
  3. пароля нет в `docker inspect` и `ps` контейнера (0 совпадений); env — только путь конфига, регулярка, REV;
  4. повторный деплой без `MAIL_RELAY_MATCHING` — регулярка из `.env`, контейнер mailpit тот же (id не сменился);
  5. пароль очищен — EXIT 0, `relay выключен (нет MAIL_RELAY_PASSWORD)`, контейнер пересоздан, `Enabled=false`,
     письмо на разрешённый адрес осталось только в Mailpit;
  6. `MAIL_FROM='Покатим dev <no-reply@on-bike.by>'` → заменён на `@limedolphin.com`; ручной
     `'Покатим dev <pokatim@gmail.com>'` не тронут;
  7. тот же relay-файл без CA тестового «SES» — `x509: certificate signed by unknown authority`, письмо не ушло;
  8. невалидная регулярка (`'`, `.*` без `@`) — `::error::` без значения; проверка preflight прогнана на 8 значениях.
  Тестовые контейнеры, тома, сеть и образы удалены (`relaytest` — 0).
- `bash -n`, `shellcheck` v0.10.0 — 0; `actionlint` 1.7.7 (deploy-dev.yml, ci.yml) — 0; `pnpm check` — см. отчёт.

**NOT VERIFIED:** реальная отправка через SES/Gmail (нет кредов; DNS/SES — автор), деплой на сервере.
