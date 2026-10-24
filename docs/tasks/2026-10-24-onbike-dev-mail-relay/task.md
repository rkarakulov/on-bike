# Dev-стенд: реальная доставка писем разрешённым адресам (relay Mailpit → SMTP)

## 1. Title
Письма стенда уходят в настоящие ящики (Amazon SES; временно — Gmail): адресам из закрытого списка или всем
(режим `*`, решение автора). Все письма по-прежнему видны в `https://<хост>/mail/`.

## 2. Goal
Тестировщики получают письма подтверждения в свои ящики без Mailpit. Остальные адреса (чужие, случайные, выдуманные)
наружу не уходят.

## 3. Scope
- `infra/deploy/env.template` — `MAIL_RELAY_HOST`/`MAIL_RELAY_PORT` (SES eu-north-1:587), пустые
  `MAIL_RELAY_USERNAME`/`MAIL_RELAY_PASSWORD`; `MAIL_FROM` → `'Покатим dev <no-reply@limedolphin.com>'`.
- `infra/deploy/bootstrap.sh` — список получателей из stdin, его проверка, сборка регулярки, `mailpit-relay.yml`;
  управляемые ключи `MAIL_RELAY_RECIPIENTS`, `MAILPIT_RELAY_{CONFIG,ALL,MATCHING,REV}`; `migrate_mail_from` —
  два прежних умолчания.
- `infra/deploy/docker-compose.yml` — Mailpit: `MP_SMTP_RELAY_CONFIG` (файл), `MP_SMTP_RELAY_ALL`,
  `MP_SMTP_RELAY_MATCHING`.
- `infra/deploy/deploy.sh` — получатели из stdin (после токена GHCR) → stdin `bootstrap.sh`; smoke состояния relay.
- `.github/workflows/deploy-dev.yml` — секрет `DEV_MAIL_RELAY_RECIPIENTS`: проверка в preflight, передача через
  stdin ssh, строка в Summary.
- `docs/runbooks/deploy.md` — «Почта» (Gmail и SES: включить, проверить, выключить), `.env`, первичная настройка.

## 4. Out of Scope
- Изменения API/worker (`SMTP_URL` по-прежнему `smtp://mailpit:1025`).
- Действия в AWS, Google, DNS и на сервере — делает автор по runbook.
- Хранилище Mailpit на томе (письма теряются при пересоздании контейнера, как и раньше).

## 5. Решения
- **Механизм — штатный auto-relay Mailpit v1.31.6.** Сверено по `--help` образа и исходнику тега `v1.31.6`
  (`cmd/root.go`, `config/validators.go`, `internal/smtpd/relay.go`).
  - `MP_SMTP_RELAY_MATCHING`: копия письма уходит только адресатам, совпавшим с регуляркой (RE2).
  - `MP_SMTP_RELAY_ALL` («relay all») — копия уходит всем адресатам (только blocked-recipients фильтрует; matching при
    нём игнорируется, `allowed-recipients` относится только к ручному «Release»).
  - Письмо всегда сохраняется в Mailpit. Ошибка relay — только в логе mailpit (`forward-smtp-errors` выключен), API
    не затронут.
  - Matching или relay all без relay-конфига не дают Mailpit стартовать — поэтому конфиг и режим передаются
    только вместе (`MAILPIT_RELAY_CONFIG` пуст при выключенном relay).
- **Три режима по секрету `DEV_MAIL_RELAY_RECIPIENTS`:** ровно `*` (пробелы по краям допустимы) → `all`
  (`MAILPIT_RELAY_ALL=true`, без `allowed-recipients`); список адресов → `list` (якорная регулярка); пусто или нет →
  `off`. `*` вместе с адресами — ошибка. Bootstrap печатает `ONBIKE_MAIL_RELAY=list|all|off`.
- **Получатели — список точных адресов, не регулярка** (ревью PR #16).
  - Секрет окружения `dev` `DEV_MAIL_RELAY_RECIPIENTS`: адреса через запятую. Как секрет он маскируется в логах.
  - Проверка в preflight и bootstrap (одна логика): ровно `*` или ≤ 20 адресов; каждый —
    `^[A-Za-z0-9._+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})+$` и ≤ 254 символов. Пробелы по краям и пустые
    элементы отбрасываются; управляющие символы запрещены. В лог идёт только номер элемента.
  - Передача: env шага deploy (как `GHCR_TOKEN`) → вторая строка stdin `ssh` (первая — токен) → `deploy.sh`
    (`MAIL_RELAY_RECIPIENTS_STDIN=1`) → stdin `bootstrap.sh`. Не попадает в argv, в env удалённой команды и в
    `vars.*`.
  - Секрет — источник истины: workflow передаёт строку всегда, пустая (секрета нет) очищает
    `MAIL_RELAY_RECIPIENTS` в `.env` → relay выключен. Без флага (ручной `deploy.sh`) остаётся прежний список.
  - Регулярку собирает bootstrap: `(?i)^(a@x\.com|b@y\.org)$`. `.` и `+` экранируются; других спецсимволов RE2 набор
    адресов не допускает. Якоря и группа исключают совпадение по подстроке, `(?i)` — регистр (домен регистронезависим).
- **Креды — файлом, не env.**
  - `MP_SMTP_RELAY_CONFIG=/etc/mailpit/relay.yml` — bind `~/on-bike/mailpit-relay.yml` (600, `create_host_path: false`).
  - YAML пишет `bootstrap.sh` из `.env`, значения в одинарных кавычках: host, port, `starttls: true`,
    `allow-insecure: false`, `auth: plain`, username, password, `allowed-recipients` = та же регулярка (ограничивает
    и ручной «Release»).
  - Файл есть всегда; при выключенном relay — только комментарий, без значений.
  - Логин и пароль: только `[A-Za-z0-9._@+/=-]` (SES — base64, Gmail App Password — латиница); иначе деплой падает с
    именем ключа. Одна пара внешних кавычек в `.env` снимается.
- **Включение.**
  - Список, логин и пароль непусты → `MAILPIT_RELAY_MATCHING` = регулярка, иначе пусто.
  - Compose: `MP_SMTP_RELAY_CONFIG: ${MAILPIT_RELAY_MATCHING:+/etc/mailpit/relay.yml}`.
  - Выключено — деплой не падает, одна строка лога `почта: relay выключен (нет <ключи>)`.
- **Пересоздание.** `MAILPIT_RELAY_REV` (16 hex sha256 файла) → env контейнера `ONBIKE_RELAY_REV`: смена кредов,
  хоста или списка пересоздаёт mailpit (иначе bind держал бы старый inode файла).
- **Провайдер-нейтрально.** Хост и порт — ключи `.env` (умолчание — SES); bootstrap дописывает их и не перезаписывает.
  Gmail: `smtp.gmail.com:587` + App Password, `MAIL_FROM` = адрес ящика (ручное значение).
- **MAIL_FROM.** `migrate_mail_from` заменяет только `'on-bike dev <no-reply@on-bike.by>'` и
  `'Покатим dev <no-reply@on-bike.by>'`; ручные значения не трогает.
- **Smoke.** `GET /mail/api/v1/webui` с паролем UI через stdin curl: `MessageRelay.Enabled` должен совпасть с решением
  bootstrap. Тело ответа не выводится — в нём регулярка.
- **Summary и runbook — один текст.**
  - Список: «Почта наружу: relay включён — только адресам из секрета `DEV_MAIL_RELAY_RECIPIENTS`, копия в Mailpit
    (runbook «Почта»)».
  - Всем: «Почта наружу: relay: всем — каждое письмо уходит адресату, копия в Mailpit (runbook «Почта»)».
  - Выключен: «Почта наружу: relay выключен — письма только в Mailpit (runbook «Почта»)».

## 8.2 Deviations from spec
- Сверх задачи:
  - строка состояния relay в Summary;
  - smoke состояния relay;
  - `allowed-recipients` (ограничение ручного «Release»);
  - `(?i)` в регулярке.
- `MAIL_RELAY_HOST` должен быть FQDN (с точкой) — проверка в bootstrap.
- Ревью PR #16: вместо переменной-регулярки `DEV_MAIL_RELAY_MATCHING` — секрет-список `DEV_MAIL_RELAY_RECIPIENTS`
  (решение оркестратора). Переменная `vars.DEV_MAIL_RELAY_MATCHING` в workflow больше не читается.
- Решение автора: режим «всем» (`*`) — на dev письма уходят всем получателям; список — второй режим.

## 8.3 Security checklist
1. **AuthN/AuthZ.**
   - UI/API Mailpit — basic-auth, как раньше.
   - Relay включает только автор: креды — руками в `.env` сервера, список — секрет окружения `dev` (права на
     репозиторий; Deployment branches: develop).
   - Ручной «Release» из UI в режиме списка ограничен той же регуляркой; в режиме «всем» — не ограничен.
2. **Входные данные.**
   - Список: ≤ 20 простых e-mail из безопасного набора символов, проверка в preflight и в bootstrap. Подстановка
     регулярки, `|`, `$`, кавычек и переводов строк невозможна.
   - Хост — FQDN, порт 1–65535, логин и пароль — `[A-Za-z0-9._@+/=-]`. В YAML — одинарные кавычки с удвоением `'`.
3. **Данные наружу.**
   - Режим списка: наружу — только точным адресам (якорная регулярка; `x.com.evil` и `xa@x.com` не проходят —
     проверено).
   - **Режим «всем» (`*`) — принятый риск (решение автора).** Письмо уходит на любой адрес, введённый при регистрации,
     в т. ч. чужой или выдуманный: спам от имени ящика стенда, жалобы, bounce. Защита — лимиты API: регистраций
     ≤ 20 в час с IP, повтор письма — пауза 60 с и ≤ 10 в сутки на аккаунт (`identity.policy.ts`). Gmail: ~500 писем
     в сутки; при злоупотреблении Google может заблокировать ящик. Для prod — только SES с проверенным доменом
     (DKIM/SPF/DMARC). Включать на время активного тестирования; в Summary — «relay: всем».
   - STARTTLS обязателен, сертификат проверяется (`allow-insecure: false`). Проверено: чужой CA → `x509: certificate
     signed by unknown authority`, письмо не ушло.
   - Адреса — секрет: маскируются в логе Actions, не попадают в Summary, argv и env удалённой команды.
4. **Злоупотребления.** Режим списка — не больше 20 заранее заданных адресов; режим «всем» — только лимиты API
   (см. п. 3). Лимиты провайдера (SES sandbox 200/сутки, Gmail ~500): превышение — ошибка только в логе mailpit.
5. **Секреты и логи.**
   - Логин и пароль SMTP — только в `.env` (600) и `mailpit-relay.yml` (600) сервера.
   - Не попадают в git, GitHub, argv (`printf` — builtin), env контейнера и `docker inspect` (проверено), лог.
   - Креды не передавать в мессенджерах — вписывать сразу в `.env` сервера (runbook).
   - Mailpit пишет в свой лог host:port и регулярку с адресами — это лог сервера, смотреть по SSH.
   - Остаточный риск: root и группа `docker` сервера читают файл, `.env` и env контейнера (там регулярка) — те же, кто
     читает остальные секреты.
6. **Аудит.** Не требуется (dev); включение и выключение видны в прогонах `deploy-dev` и Summary.

## 9. Acceptance Criteria
1. Без логина, пароля или получателей relay выключен: деплой зелёный, одна строка `relay выключен`, в Mailpit
   `MessageRelay.Enabled=false`, письма только в Mailpit.
2. С логином, паролем и списком письмо на адрес из списка (в т. ч. с `.`, `+`, `-`, другой регистр) доходит до внешнего
   SMTP (STARTTLS + PLAIN). На похожие и чужие адреса не уходит. Все письма видны в Mailpit стека.
3. Секрет `*` — relay всех писем: письмо на произвольный адрес доходит до внешнего SMTP, `allowed-recipients` не
   задан, Summary «relay: всем».
4. Получатели идут на сервер через stdin; пустая строка (секрета нет) очищает список и выключает relay; ручной
   `deploy.sh` без флага сохраняет прежний список.
5. Пароль SMTP не виден в `docker inspect`, argv и выводе деплоя.
6. Смена кредов или списка пересоздаёт mailpit; повторный деплой без изменений — нет.
7. `MAIL_FROM` с прежними умолчаниями `@on-bike.by` заменяется на `@limedolphin.com`; ручное значение остаётся.
8. Невалидный список или креды — ошибка preflight/bootstrap без вывода значения.
9. `shellcheck`, `bash -n`, `actionlint`, `pnpm check` — чисто.
10. Runbook «Почта»: Gmail и SES (DNS, креды, sandbox), где вписать креды, `gh secret set`, проверка, выключение;
   текст Summary совпадает с runbook.

## 10. Documentation Impact
- `docs/runbooks/deploy.md`:
  - «Первичная настройка» — `gh secret set DEV_MAIL_RELAY_RECIPIENTS`;
  - «`.env` сервера» — ключи `MAIL_RELAY_*`, `MAILPIT_RELAY_*`, миграция `MAIL_FROM`;
  - «Почта» — подраздел «Реальная доставка (relay)»: режимы (список, всем, выключен), риски «всем», Gmail, SES,
    проверка, выключение.
- Комментарии-шапки `bootstrap.sh`, `deploy.sh`, `env.template`, `docker-compose.yml`, `deploy-dev.yml`.
- AGENTS.md и ADR не затронуты: инфраструктура dev, контракт API не меняется.

## 12. Outcome

### Coder, 2026-10-24 — проход 1 (регулярка-переменная)
Relay проверен локальным деплоем со вторым Mailpit в роли «SES»: STARTTLS + PLAIN, точные совпадения, пароль не в
`docker inspect`, проверка сертификата (чужой CA → письмо не ушло), миграция `MAIL_FROM`.

### Coder, 2026-10-24 — проход 2 (ревью PR #16: список-секрет)
**Проверки (локально, Docker Desktop arm64):**
- Сборка регулярки и проверка списка (`parse_recipients`/`recipients_regex` из `bootstrap.sh`, bash 3.2 и 5.2):
  - `'first.last+tag@ex-ample.com, Bob@Example.org ,'` →
    `(?i)^(first\.last\+tag@ex-ample\.com|Bob@Example\.org)$`;
  - `a_b@x.co.uk` → `(?i)^(a_b@x\.co\.uk)$`;
  - пустой список и `' , '` → пустой список;
  - отказ — пробел, `'`, `a@x` (без точки), `|`, `$`, `(?i).*`, перевод строки, 21 адрес; 20 адресов — ok.
- Шаг preflight из `deploy-dev.yml` (скрипт извлечён из YAML, 8 значений) — те же решения; в сообщениях только номер
  элемента.
- `deploy.sh` (проект `onbike-relaytest`, `ON_BIKE_SKIP_PULL=1 ON_BIKE_SKIP_NGINX=1`, свои порты, образы собраны
  локально). «SES» — второй Mailpit (`MP_SMTP_AUTH`, `MP_SMTP_REQUIRE_STARTTLS`, сертификат тестового CA); в копии
  compose для теста добавлен только этот CA через `SSL_CERT_FILE`.
  1. Без кредов и флага — EXIT 0, `relay выключен (нет MAIL_RELAY_RECIPIENTS MAIL_RELAY_USERNAME
     MAIL_RELAY_PASSWORD)`, `Enabled=false`.
  2. Креды (пароль `'relay+pass/test='` в кавычках) + stdin `first.last+tag@ex-ample.com, Bob@Example.org` — EXIT 0,
     `Enabled=true`. Из 7 писем в «SES» дошли только `first.last+tag@ex-ample.com` и `bob@example.org` (регистр).
     Не дошли: `firstxlast+tag@…`, `first.lasttag@…`, `…@ex-ample.com.evil`, `xfirst.last+tag@…`,
     `other@example.com`. В Mailpit стека — все 7.
  3. Пароля нет в `docker inspect` (0 совпадений).
  4. Ручной запуск без флага — список из `.env`, mailpit не пересоздан.
  5. Флаг + пустая строка (секрета нет) — `relay выключен (нет MAIL_RELAY_RECIPIENTS)`, `MAIL_RELAY_RECIPIENTS=''`,
     mailpit пересоздан, `Enabled=false`.
  6. Пароль с пробелом и `$` → `::error::MAIL_RELAY_PASSWORD в .env: допустимы …`. Список с `b c@y.org` →
     `::error::получатели relay: элемент 2 …`. Значения в выводе нет.
  7. Две строки stdin (токен GHCR + список, как в workflow) — список прочитан второй строкой, relay включён,
     письмо дошло.
  Тестовые контейнеры, тома, сеть, образы и файлы удалены (`relaytest` — 0).
- `bash -n` — ok; `shellcheck` v0.10.0 — 0; `actionlint` 1.7.7 (deploy-dev.yml, ci.yml) — 0; `pnpm check` — EXIT 0.

### Coder, 2026-10-24 — проход 3 (режим «всем»)
- `parse_recipients`: `*` и ` * ` → режим «всем»; `*,a@x.com` и `**` → ошибка (элемент 1). Preflight — так же.
- `deploy.sh` (тот же стенд и «SES»; токен GHCR + список двумя строками stdin):
  1. без кредов — `off`;
  2. список `first.last+tag@ex-ample.com, Bob@Example.org` — `list`; в «SES» только 2 из 7 писем (как в проходе 2);
  3. ` * ` — `ONBIKE_MAIL_RELAY=all`, `relay включён … — ВСЕМ получателям`, `Enabled=true`; env контейнера
     `MP_SMTP_RELAY_ALL=true`, `MP_SMTP_RELAY_MATCHING=` пусто; в YAML нет `allowed-recipients`; Mailpit логирует
     `auto-relaying all new messages`; все 7 писем (в т. ч. `other@example.com`, `…evil`) — и в «SES», и в Mailpit;
     пароля в `docker inspect` нет;
  4. пустая строка — `off`, mailpit пересоздан.
  Найдено и исправлено: перевод строки в `MANAGED_KEYS` ломал `awk -v` (BSD awk) — ключи собираются в одну строку.
  Тестовые контейнеры, тома, сеть, образы удалены (`relaytest` — 0).
- `shellcheck` — 0; `actionlint` — 0; `pnpm check` — EXIT 0.

**NOT VERIFIED:** реальная отправка через SES/Gmail (нет кредов; DNS/SES — автор), деплой на сервере, маскирование
секрета в живом логе Actions.
