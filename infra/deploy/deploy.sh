#!/usr/bin/env bash
# Деплой стека pokatim на dev-сервер (вызывает .github/workflows/deploy-dev.yml по SSH; вручную — runbook
# docs/runbooks/deploy.md). Рядом лежат bootstrap.sh, docker-compose.yml, env.template.
#   bootstrap (каталог, .env, nginx, сертификат) → pull образов → postgres/redis/mailpit → миграции
#   (одноразовый контейнер) → api/worker/web/admin с ожиданием healthcheck → smoke → прочистка старых образов
#   pokatim (только по label проекта).
# Env: POKATIM_TAG (тег образов, обязательно), PUBLIC_HOST (обязательно), POKATIM_DIR (~/pokatim),
#      POKATIM_PROJECT (compose project, pokatim-dev), GHCR_USER + GHCR_TOKEN_STDIN=1 — токен чтения GHCR
#      первой строкой stdin (логин во временный DOCKER_CONFIG, удаляется сразу после pull);
#      MAIL_RELAY_RECIPIENTS_STDIN=1 — получатели relay Mailpit → внешний SMTP (адреса через запятую или «*») следующей
#      строкой stdin (после токена GHCR); передаются bootstrap.sh тоже через stdin; без флага — прежние из .env;
#      POKATIM_SKIP_PULL=1 / POKATIM_SKIP_NGINX=1 — локальная проверка без registry и nginx;
#      MIN_FREE_MB (1536) — минимум свободного места на диске Docker;
#      POKATIM_LEGACY_DIR (~/on-bike), POKATIM_LEGACY_PROJECT (on-bike-dev) — стенд до переименования on-bike → pokatim:
#      его .env (секреты) и mailpit-relay.yml переносятся, если в POKATIM_DIR .env ещё нет; его стек останавливается
#      (compose down без -v — тома остаются, уборка — runbook «Переезд on-bike → pokatim»).
set -Eeuo pipefail

POKATIM_DIR="${POKATIM_DIR:-${HOME}/pokatim}"
POKATIM_PROJECT="${POKATIM_PROJECT:-pokatim-dev}"
API_PORT="${POKATIM_API_PORT:-3100}"
WEB_PORT="${POKATIM_WEB_PORT:-8180}"
ADMIN_PORT="${POKATIM_ADMIN_PORT:-8181}"
MAIL_PORT="${POKATIM_MAIL_UI_PORT:-8125}"
MIN_FREE_MB="${MIN_FREE_MB:-1536}"
LEGACY_DIR="${POKATIM_LEGACY_DIR:-${HOME}/on-bike}"
LEGACY_PROJECT="${POKATIM_LEGACY_PROJECT:-on-bike-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export POKATIM_DIR POKATIM_API_PORT="${API_PORT}" POKATIM_WEB_PORT="${WEB_PORT}" POKATIM_ADMIN_PORT="${ADMIN_PORT}" \
  POKATIM_MAIL_UI_PORT="${MAIL_PORT}"

log() { printf '[deploy] %s\n' "$*"; }
die() {
  printf '::error::%s\n' "$*"
  exit 1
}

[[ "${POKATIM_TAG:-}" =~ ^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$ ]] || die "POKATIM_TAG не задан или некорректен"
[[ "${POKATIM_PROJECT}" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || die "POKATIM_PROJECT некорректен"
[[ "${LEGACY_PROJECT}" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || die "POKATIM_LEGACY_PROJECT некорректен"
export POKATIM_TAG

# токен GHCR читается до всего остального: stdin больше никому не нужен
GHCR_TOKEN=""
if [[ "${GHCR_TOKEN_STDIN:-0}" == "1" ]]; then
  IFS= read -r GHCR_TOKEN || true
  [[ -n "${GHCR_TOKEN}" && -n "${GHCR_USER:-}" ]] || die "GHCR_TOKEN_STDIN=1, но токен или GHCR_USER пусты"
fi
# получатели relay — не в argv и не в env (адреса тестировщиков); пустая строка — relay выключен
RELAY_RECIPIENTS_STDIN="${MAIL_RELAY_RECIPIENTS_STDIN:-0}"
unset MAIL_RELAY_RECIPIENTS_STDIN
RELAY_RECIPIENTS=""
if [[ "${RELAY_RECIPIENTS_STDIN}" == "1" ]]; then
  IFS= read -r RELAY_RECIPIENTS || true
fi

mkdir -p "${POKATIM_DIR}"
chmod 700 "${POKATIM_DIR}"
if command -v flock >/dev/null 2>&1; then
  exec 9>"${POKATIM_DIR}/.deploy.lock"
  flock -w 900 9 || die "другой деплой держит ${POKATIM_DIR}/.deploy.lock дольше 15 минут"
fi

# файлы стека рядом со скриптом (деплой копирует их в POKATIM_DIR; локально — из infra/deploy)
if [[ "${SCRIPT_DIR}" != "$(cd "${POKATIM_DIR}" && pwd)" ]]; then
  cp "${SCRIPT_DIR}/docker-compose.yml" "${SCRIPT_DIR}/env.template" "${SCRIPT_DIR}/bootstrap.sh" "${POKATIM_DIR}/"
fi

# путь для лога — от домашнего каталога (имя пользователя сервера в публичный лог не выводится)
home_hint() {
  if [[ "$1" == "${HOME}/"* ]]; then
    # shellcheck disable=SC2088 # «~» — текст подсказки, не путь для раскрытия
    printf '~/%s' "${1#"${HOME}"/}"
  else
    printf '%s' "$1"
  fi
}

# Переезд on-bike → pokatim, шаг 1: .env прежнего стенда (секреты: пароль БД, JWT, Mailpit, relay SMTP, MAIL_FROM) —
# в новый каталог, пока своего .env нет; копия на том же сервере, 600, значения не выводятся. Повторный деплой
# ничего не копирует (.env уже есть).
migrate_legacy_env() {
  [[ -f "${LEGACY_DIR}/.env" && ! -e "${POKATIM_DIR}/.env" ]] || return 0
  [[ "$(cd "${LEGACY_DIR}" && pwd)" != "$(cd "${POKATIM_DIR}" && pwd)" ]] || return 0
  local file
  for file in mailpit-relay.yml .env; do
    [[ ! -f "${LEGACY_DIR}/${file}" ]] || install -m 600 "${LEGACY_DIR}/${file}" "${POKATIM_DIR}/${file}"
  done
  log "переезд: .env и mailpit-relay.yml перенесены из $(home_hint "${LEGACY_DIR}") в $(home_hint "${POKATIM_DIR}") (секреты сохранены)"
}
migrate_legacy_env

docker_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
[[ -n "${docker_root}" && -d "${docker_root}" ]] || docker_root="/"
free_mb="$(df -Pm "${docker_root}" | awk 'NR == 2 { print $4 }')"
log "свободно на диске Docker: ${free_mb} МБ"
[[ "${free_mb}" -ge "${MIN_FREE_MB}" ]] ||
  die "мало места: ${free_mb} МБ < ${MIN_FREE_MB} МБ — освободите диск (runbook «Диск»), чужие образы не трогаем"

bootstrap_log="$(mktemp)"
printf '%s\n' "${RELAY_RECIPIENTS}" |
  MAIL_RELAY_RECIPIENTS_STDIN="${RELAY_RECIPIENTS_STDIN}" bash "${POKATIM_DIR}/bootstrap.sh" | tee "${bootstrap_log}"
RELAY_RECIPIENTS=""
tls="$(sed -n 's/^POKATIM_TLS=//p' "${bootstrap_log}" | tail -1)"
mail_relay="$(sed -n 's/^POKATIM_MAIL_RELAY=//p' "${bootstrap_log}" | tail -1)"
rm -f "${bootstrap_log}"

compose() {
  docker compose -p "${POKATIM_PROJECT}" -f "${POKATIM_DIR}/docker-compose.yml" \
    --env-file "${POKATIM_DIR}/.env" "$@"
}

# лог Actions публичный: только состояние и коды выхода контейнеров; логи приложений (могут содержать
# персональные данные тестировщиков) — по SSH, runbook «Логи»
show_state() {
  compose ps -a --format 'table {{.Service}}\t{{.State}}\t{{.Status}}' || true
  printf '::notice::логи контейнеров — по SSH: docker compose -p %s logs --tail 200 <сервис> (docs/runbooks/deploy.md)\n' \
    "${POKATIM_PROJECT}"
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

if [[ "${POKATIM_SKIP_PULL:-0}" == "1" ]]; then
  log "POKATIM_SKIP_PULL=1: образы не тянутся (локальные)"
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
  log "образы ${POKATIM_TAG} получены"
else
  compose pull --quiet
fi

# Переезд on-bike → pokatim, шаг 2: прежний стек занимает те же порты хоста — останавливается перед подъёмом нового
# (после pull: простой — только на время старта). Без -v: тома прежнего стека остаются (уборка руками, runbook).
# Compose — из пустого каталога, только по имени проекта: файлы прежнего стека не нужны.
stop_legacy_stack() {
  [[ "${LEGACY_PROJECT}" != "${POKATIM_PROJECT}" ]] || return 0
  [[ -n "$(docker ps -aq --filter "label=com.docker.compose.project=${LEGACY_PROJECT}")" ]] || return 0
  log "переезд: прежний стек ${LEGACY_PROJECT} останавливается (compose down без -v — тома остаются)"
  local empty
  empty="$(mktemp -d)"
  (cd "${empty}" && docker compose -p "${LEGACY_PROJECT}" down --remove-orphans)
  rmdir "${empty}"
}
stop_legacy_stack

log "postgres, redis, mailpit"
compose up -d --wait --wait-timeout 180 postgres redis mailpit

# вывод миграций (SQL, ошибки БД) — в файл на сервере, не в публичный лог Actions: там только код выхода
migrate_log="${POKATIM_DIR}/migrate.log"
migrate_log_hint="$(home_hint "${migrate_log}")"
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
  "${POKATIM_DIR}/.env")"
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
[[ "${mail_relay}" != "list" && "${mail_relay}" != "all" ]] || relay_enabled=true
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
  *) log "vhost nginx не проверяется (POKATIM_SKIP_NGINX)" ;;
esac
unset MAIL_UI_PASSWORD
log "health: ${health}; UI Mailpit /mail/ — под паролем; relay почты: ${mail_relay:-off}"

trap - ERR
# только образы pokatim без контейнеров (label из infra/docker/Dockerfile); чужие образы не трогаем
docker image prune -af --filter 'label=by.pokatim.project=pokatim' >/dev/null || true
# образы стенда до переименования (прежний label): после остановки его стека контейнеров у них нет
docker image prune -af --filter 'label=by.on-bike.project=on-bike' >/dev/null || true
log "старые образы pokatim прочищены; свободно: $(df -Pm / | awk 'NR == 2 { print $4 }') МБ"
echo "POKATIM_DEPLOYED=${POKATIM_TAG}"
