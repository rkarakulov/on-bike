#!/usr/bin/env bash
# Деплой стека on-bike на dev-сервер (вызывает .github/workflows/deploy-dev.yml по SSH; вручную — runbook
# docs/runbooks/deploy.md). Рядом лежат bootstrap.sh, docker-compose.yml, env.template.
#   bootstrap (каталог, .env, nginx, сертификат) → pull образов → postgres/redis/mailpit → миграции
#   (одноразовый контейнер) → api/worker/web/admin с ожиданием healthcheck → smoke → прочистка старых образов
#   on-bike (только по label проекта).
# Env: ON_BIKE_TAG (тег образов, обязательно), PUBLIC_HOST (обязательно), ON_BIKE_DIR (~/on-bike),
#      ON_BIKE_PROJECT (compose project, on-bike-dev), GHCR_USER + GHCR_TOKEN_STDIN=1 — токен чтения GHCR
#      первой строкой stdin (логин во временный DOCKER_CONFIG, удаляется сразу после pull);
#      MAIL_RELAY_MATCHING — регулярка получателей relay Mailpit → внешний SMTP (bootstrap.sh; не задана — прежняя
#      из .env);
#      ON_BIKE_SKIP_PULL=1 / ON_BIKE_SKIP_NGINX=1 — локальная проверка без registry и nginx;
#      MIN_FREE_MB (1536) — минимум свободного места на диске Docker.
set -Eeuo pipefail

ON_BIKE_DIR="${ON_BIKE_DIR:-${HOME}/on-bike}"
ON_BIKE_PROJECT="${ON_BIKE_PROJECT:-on-bike-dev}"
API_PORT="${ON_BIKE_API_PORT:-3100}"
WEB_PORT="${ON_BIKE_WEB_PORT:-8180}"
ADMIN_PORT="${ON_BIKE_ADMIN_PORT:-8181}"
MAIL_PORT="${ON_BIKE_MAIL_UI_PORT:-8125}"
MIN_FREE_MB="${MIN_FREE_MB:-1536}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ON_BIKE_DIR ON_BIKE_API_PORT="${API_PORT}" ON_BIKE_WEB_PORT="${WEB_PORT}" ON_BIKE_ADMIN_PORT="${ADMIN_PORT}" \
  ON_BIKE_MAIL_UI_PORT="${MAIL_PORT}"

log() { printf '[deploy] %s\n' "$*"; }
die() {
  printf '::error::%s\n' "$*"
  exit 1
}

[[ "${ON_BIKE_TAG:-}" =~ ^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$ ]] || die "ON_BIKE_TAG не задан или некорректен"
[[ "${ON_BIKE_PROJECT}" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || die "ON_BIKE_PROJECT некорректен"
export ON_BIKE_TAG

# токен GHCR читается до всего остального: stdin больше никому не нужен
GHCR_TOKEN=""
if [[ "${GHCR_TOKEN_STDIN:-0}" == "1" ]]; then
  IFS= read -r GHCR_TOKEN || true
  [[ -n "${GHCR_TOKEN}" && -n "${GHCR_USER:-}" ]] || die "GHCR_TOKEN_STDIN=1, но токен или GHCR_USER пусты"
fi

mkdir -p "${ON_BIKE_DIR}"
chmod 700 "${ON_BIKE_DIR}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"${ON_BIKE_DIR}/.deploy.lock"
  flock -w 900 9 || die "другой деплой держит ${ON_BIKE_DIR}/.deploy.lock дольше 15 минут"
fi

# файлы стека рядом со скриптом (деплой копирует их в ON_BIKE_DIR; локально — из infra/deploy)
if [[ "${SCRIPT_DIR}" != "$(cd "${ON_BIKE_DIR}" && pwd)" ]]; then
  cp "${SCRIPT_DIR}/docker-compose.yml" "${SCRIPT_DIR}/env.template" "${SCRIPT_DIR}/bootstrap.sh" "${ON_BIKE_DIR}/"
fi

docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
[[ -n "${docker_root}" && -d "${docker_root}" ]] || docker_root="/"
free_mb="$(df -Pm "${docker_root}" | awk 'NR == 2 { print $4 }')"
log "свободно на диске Docker: ${free_mb} МБ"
[[ "${free_mb}" -ge "${MIN_FREE_MB}" ]] ||
  die "мало места: ${free_mb} МБ < ${MIN_FREE_MB} МБ — освободите диск (runbook «Диск»), чужие образы не трогаем"

bootstrap_log="$(mktemp)"
bash "${ON_BIKE_DIR}/bootstrap.sh" | tee "${bootstrap_log}"
tls="$(sed -n 's/^ONBIKE_TLS=//p' "${bootstrap_log}" | tail -1)"
mail_relay="$(sed -n 's/^ONBIKE_MAIL_RELAY=//p' "${bootstrap_log}" | tail -1)"
rm -f "${bootstrap_log}"

compose() {
  docker compose -p "${ON_BIKE_PROJECT}" -f "${ON_BIKE_DIR}/docker-compose.yml" \
    --env-file "${ON_BIKE_DIR}/.env" "$@"
}

# лог Actions публичный: только состояние и коды выхода контейнеров; логи приложений (могут содержать
# персональные данные тестировщиков) — по SSH, runbook «Логи»
show_state() {
  compose ps -a --format 'table {{.Service}}\t{{.State}}\t{{.Status}}' || true
  printf '::notice::логи контейнеров — по SSH: docker compose -p %s logs --tail 200 <сервис> (docs/runbooks/deploy.md)\n' \
    "${ON_BIKE_PROJECT}"
}
on_failure() {
  local code=$?
  printf '::error::деплой упал (код %s); состояние контейнеров ниже\n' "${code}"
  show_state
  exit "${code}"
}
fail_smoke() {
  trap - ERR
  printf '::error::smoke: %s\n' "$*"
  show_state
  exit 1
}
trap on_failure ERR

if [[ "${ON_BIKE_SKIP_PULL:-0}" == "1" ]]; then
  log "ON_BIKE_SKIP_PULL=1: образы не тянутся (локальные)"
elif [[ -n "${GHCR_TOKEN}" ]]; then
  # логин только во временный конфиг: учётки других проектов в ~/.docker не трогаем, на диске не остаётся
  docker_config="$(mktemp -d)"
  trap 'rm -rf "${docker_config}"' EXIT
  printf '%s' "${GHCR_TOKEN}" |
    DOCKER_CONFIG="${docker_config}" docker login ghcr.io -u "${GHCR_USER}" --password-stdin >/dev/null
  GHCR_TOKEN=""
  DOCKER_CONFIG="${docker_config}" compose pull --quiet
  DOCKER_CONFIG="${docker_config}" docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf "${docker_config}"
  log "образы ${ON_BIKE_TAG} получены"
else
  compose pull --quiet
fi

log "postgres, redis, mailpit"
compose up -d --wait --wait-timeout 180 postgres redis mailpit

# вывод миграций (SQL, ошибки БД) — в файл на сервере, не в публичный лог Actions: там только код выхода
migrate_log="${ON_BIKE_DIR}/migrate.log"
# подсказка в лог — путь от домашнего каталога (имя пользователя сервера в публичный лог не выводится)
migrate_log_hint="${migrate_log}"
if [[ "${migrate_log}" == "${HOME}/"* ]]; then
  # shellcheck disable=SC2088 # «~» — текст подсказки, не путь для раскрытия
  migrate_log_hint="~/${migrate_log#"${HOME}"/}"
fi
log "миграции (одноразовый контейнер), вывод — ${migrate_log_hint} на сервере"
(umask 077 && : >"${migrate_log}")
chmod 600 "${migrate_log}"
migrate_code=0
compose run --rm migrate >"${migrate_log}" 2>&1 || migrate_code=$?
if [[ "${migrate_code}" -ne 0 ]]; then
  trap - ERR
  printf '::error::миграции упали (код %s); вывод — по SSH: %s (docs/runbooks/deploy.md, «Логи»)\n' \
    "${migrate_code}" "${migrate_log_hint}"
  show_state
  exit "${migrate_code}"
fi

log "api, worker, web, admin"
compose up -d --wait --wait-timeout 300 --remove-orphans

log "smoke"
health="$(curl -fsS --max-time 10 "http://127.0.0.1:${API_PORT}/v1/health")" || fail_smoke "/v1/health не отвечает"
[[ "${health}" == *'"status":"ok"'* ]] || fail_smoke "/v1/health не ok: ${health}"
curl -fsS --max-time 15 -o /dev/null "http://127.0.0.1:${WEB_PORT}/register" || fail_smoke "web /register не отвечает"
curl -fsS --max-time 10 -o /dev/null "http://127.0.0.1:${ADMIN_PORT}/admin/" || fail_smoke "admin /admin/ не отвечает"

# UI Mailpit под паролем: без пароля — 401, с паролем из .env — 200. Пароль — только в переменной этого процесса и
# в stdin curl (-K -): не в argv (ps) и не в лог
MAIL_UI_PASSWORD="$(awk 'index($0, "MAILPIT_UI_PASSWORD=") == 1 { sub(/^[^=]*=/, ""); v = $0 } END { print v }' \
  "${ON_BIKE_DIR}/.env")"
[[ -n "${MAIL_UI_PASSWORD}" ]] || fail_smoke "в .env нет MAILPIT_UI_PASSWORD"
# HTTP-код ответа (000 — нет ответа); $1 — anon|auth, дальше — опции и URL curl
http_code() {
  local mode="$1"
  shift
  if [[ "${mode}" == "auth" ]]; then
    printf 'user = "dev:%s"\n' "${MAIL_UI_PASSWORD}" |
      curl -s -o /dev/null -w '%{http_code}' --max-time 10 -K - "$@" || true
  else
    curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" || true
  fi
}
# $1 — подпись для лога, дальше — опции и URL curl
check_mail_ui() {
  local label="$1" anon auth
  shift
  anon="$(http_code anon "$@")"
  auth="$(http_code auth "$@")"
  [[ "${anon}" == "401" && "${auth}" == "200" ]] ||
    fail_smoke "Mailpit ${label}: без пароля ${anon} (ждём 401), с паролем ${auth} (ждём 200)"
}
check_mail_ui "127.0.0.1:${MAIL_PORT}/mail/" "http://127.0.0.1:${MAIL_PORT}/mail/"

# relay Mailpit в том состоянии, что выбрал bootstrap (ответ API в лог не выводится: в нём регулярка получателей)
relay_enabled=false
[[ "${mail_relay}" != "on" ]] || relay_enabled=true
relay_state="$(printf 'user = "dev:%s"\n' "${MAIL_UI_PASSWORD}" |
  curl -fsS --max-time 10 -K - "http://127.0.0.1:${MAIL_PORT}/mail/api/v1/webui" 2>/dev/null |
  grep -oE '"MessageRelay":\{"Enabled":(true|false)' | grep -oE '(true|false)$' || true)"
[[ "${relay_state}" == "${relay_enabled}" ]] ||
  fail_smoke "relay Mailpit: включён=${relay_state:-?}, ждём ${relay_enabled} (логи mailpit — по SSH, runbook «Почта»)"

# через vhost nginx хоста — тем же путём, что браузер (по https, если сертификат есть)
case "${tls}" in
  https)
    curl -fsS --max-time 10 -o /dev/null --resolve "${PUBLIC_HOST}:443:127.0.0.1" "https://${PUBLIC_HOST}/v1/health" ||
      fail_smoke "https://${PUBLIC_HOST}/v1/health через nginx не отвечает"
    check_mail_ui "https://${PUBLIC_HOST}/mail/" --resolve "${PUBLIC_HOST}:443:127.0.0.1" "https://${PUBLIC_HOST}/mail/"
    ;;
  http)
    curl -fsS --max-time 10 -o /dev/null -H "Host: ${PUBLIC_HOST}" "http://127.0.0.1/v1/health" ||
      fail_smoke "http://${PUBLIC_HOST}/v1/health через nginx не отвечает"
    # без сертификата UI почты наружу не открывается (пароль шёл бы открытым текстом)
    mail_http="$(http_code anon -H "Host: ${PUBLIC_HOST}" "http://127.0.0.1/mail/")"
    [[ "${mail_http}" == "404" ]] || fail_smoke "http://${PUBLIC_HOST}/mail/ без https: ${mail_http} (ждём 404)"
    ;;
  *) log "vhost nginx не проверяется (ON_BIKE_SKIP_NGINX)" ;;
esac
unset MAIL_UI_PASSWORD
log "health: ${health}; UI Mailpit /mail/ — под паролем; relay почты: ${mail_relay:-off}"

trap - ERR
# только образы on-bike без контейнеров (label из infra/docker/Dockerfile); чужие образы не трогаем
docker image prune -af --filter 'label=by.on-bike.project=on-bike' >/dev/null || true
log "старые образы on-bike прочищены; свободно: $(df -Pm / | awk 'NR == 2 { print $4 }') МБ"
echo "ONBIKE_DEPLOYED=${ON_BIKE_TAG}"
