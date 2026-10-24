#!/usr/bin/env bash
# Идемпотентная подготовка dev-сервера под on-bike (вызывается deploy.sh на каждом деплое):
#   1. каталог стека ${ON_BIKE_DIR} (700);
#   2. .env (600): недостающие ключи из env.template дописываются, @secret генерируется здесь же
#      (openssl rand) — значения не печатаются и не покидают сервер; существующие значения не меняются,
#      кроме управляемых деплоем PUBLIC_HOST, WEB_ORIGIN, APP_LINK_BASE, ON_BIKE_TAG;
#   3. vhost nginx хоста /etc/nginx/sites-available/on-bike (+ ссылка в sites-enabled): nginx -t перед reload,
#      ошибка — откат своего файла; чужие сайты не трогаются;
#   4. сертификат Let's Encrypt (certbot --webroot /var/www/html) — только если домен ведёт на этот сервер;
#      иначе (или certbot не смог) vhost только на :80 и предупреждение, деплой не падает.
#      UI Mailpit /mail/ — только в https-vhost (пароль basic-auth не идёт открытым текстом).
# Env: PUBLIC_HOST (обязательно), ON_BIKE_TAG, ON_BIKE_DIR (~/on-bike), CERTBOT_EMAIL (необязательно),
#      ON_BIKE_{API,WEB,ADMIN,MAIL_UI}_PORT, ON_BIKE_SKIP_NGINX=1 — без шагов 3–4 (локальная проверка).
# Пишет строку `ONBIKE_TLS=https|http` для сводки деплоя; `::warning::` — аннотации GitHub Actions.
set -euo pipefail
umask 077

ON_BIKE_DIR="${ON_BIKE_DIR:-${HOME}/on-bike}"
ENV_FILE="${ON_BIKE_DIR}/.env"
TEMPLATE="${ON_BIKE_DIR}/env.template"
API_PORT="${ON_BIKE_API_PORT:-3100}"
WEB_PORT="${ON_BIKE_WEB_PORT:-8180}"
ADMIN_PORT="${ON_BIKE_ADMIN_PORT:-8181}"
MAIL_PORT="${ON_BIKE_MAIL_UI_PORT:-8125}"
SITE_NAME="on-bike"
SITE_FILE="/etc/nginx/sites-available/${SITE_NAME}"
SITE_LINK="/etc/nginx/sites-enabled/${SITE_NAME}"
WEBROOT="/var/www/html"
MANAGED_KEYS="PUBLIC_HOST WEB_ORIGIN APP_LINK_BASE ON_BIKE_TAG"

log() { printf '[bootstrap] %s\n' "$*"; }
warn() { printf '::warning::%s\n' "$*"; }
die() {
  printf '::error::%s\n' "$*"
  exit 1
}

PUBLIC_HOST="${PUBLIC_HOST:-}"
[[ "${PUBLIC_HOST}" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] ||
  die "PUBLIC_HOST не задан или не похож на имя хоста: '${PUBLIC_HOST}'"
ON_BIKE_TAG="${ON_BIKE_TAG:-}"
[[ -z "${ON_BIKE_TAG}" || "${ON_BIKE_TAG}" =~ ^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$ ]] ||
  die "ON_BIKE_TAG не похож на тег образа: '${ON_BIKE_TAG}'"
for port in "${API_PORT}" "${WEB_PORT}" "${ADMIN_PORT}" "${MAIL_PORT}"; do
  [[ "${port}" =~ ^[0-9]{2,5}$ ]] || die "порт не число: '${port}'"
done

# ---------- 1–2. каталог и .env ----------

# значение ключа из .env (без вывода); пусто — ключа нет
env_get() {
  [[ -f "${ENV_FILE}" ]] || return 0
  awk -v key="$1" 'index($0, key "=") == 1 { sub(/^[^=]*=/, ""); value = $0 } END { if (value != "") print value }' \
    "${ENV_FILE}"
}

env_has() {
  [[ -f "${ENV_FILE}" ]] && grep -q "^$1=" "${ENV_FILE}"
}

ensure_env() {
  mkdir -p "${ON_BIKE_DIR}"
  chmod 700 "${ON_BIKE_DIR}"
  [[ -f "${TEMPLATE}" ]] || die "нет ${TEMPLATE} (деплой копирует его рядом со скриптом)"
  [[ -f "${ENV_FILE}" ]] || {
    : >"${ENV_FILE}"
    log ".env создан"
  }
  chmod 600 "${ENV_FILE}"

  local line key value added=""
  while IFS= read -r line || [[ -n "${line}" ]]; do
    [[ "${line}" =~ ^[A-Z][A-Z0-9_]*= ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    env_has "${key}" && continue
    if [[ "${value}" == "@secret" ]]; then
      value="$(openssl rand -hex 32)"
    fi
    printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
    added="${added} ${key}"
  done <"${TEMPLATE}"
  [[ -z "${added}" ]] || log "в .env добавлены ключи:${added}"

  # управляемые деплоем ключи — всегда из параметров (смена домена, новый тег)
  PREVIOUS_HOST="$(env_get PUBLIC_HOST)"
  local tag="${ON_BIKE_TAG:-$(env_get ON_BIKE_TAG)}"
  local tmp
  tmp="$(mktemp "${ON_BIKE_DIR}/.env.XXXXXX")"
  awk -v keys="${MANAGED_KEYS}" '
    BEGIN { n = split(keys, list, " "); for (i = 1; i <= n; i++) managed[list[i]] = 1 }
    { key = $0; sub(/=.*/, "", key); if (!(key in managed)) print }
  ' "${ENV_FILE}" >"${tmp}"
  {
    printf 'PUBLIC_HOST=%s\n' "${PUBLIC_HOST}"
    printf 'WEB_ORIGIN=https://%s\n' "${PUBLIC_HOST}"
    printf 'APP_LINK_BASE=https://%s/\n' "${PUBLIC_HOST}"
    [[ -z "${tag}" ]] || printf 'ON_BIKE_TAG=%s\n' "${tag}"
  } >>"${tmp}"
  chmod 600 "${tmp}"
  mv -f "${tmp}" "${ENV_FILE}"
  log ".env: PUBLIC_HOST=${PUBLIC_HOST}${tag:+, ON_BIKE_TAG=${tag}} (секреты не выводятся)"
}

# ---------- 3–4. nginx и сертификат ----------

render_vhost() {
  local mode="$1"
  local cert_dir="/etc/letsencrypt/live/${PUBLIC_HOST}"
  printf '# on-bike dev: генерирует infra/deploy/bootstrap.sh на каждом деплое — правки руками перезапишутся\n'
  if [[ "${mode}" == "https" ]]; then
    cat <<EOF
# WebSocket UI Mailpit (/mail/api/events); имя переменной своё — map общий для http{} всех сайтов сервера
map \$http_upgrade \$onbike_mail_connection {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name ${PUBLIC_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    # без http2 и default_server: в nginx < 1.25 (Ubuntu 24.04 — 1.24) параметры listen относятся ко всему
    # сокету *:443 — http2 здесь включил бы HTTP/2 всем соседним сайтам
    listen 443 ssl;
    server_name ${PUBLIC_HOST};

    ssl_certificate ${cert_dir}/fullchain.pem;
    ssl_certificate_key ${cert_dir}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:onbike_ssl:10m;
    ssl_session_timeout 1d;
    # dev: короткий HSTS без includeSubDomains — не мешает смене домена
    add_header Strict-Transport-Security "max-age=86400" always;
EOF
  else
    cat <<EOF
# сертификата ещё нет: только :80 (cookie сессии web __Secure- без https не работает, docs/runbooks/deploy.md)
server {
    listen 80;
    server_name ${PUBLIC_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${WEBROOT};
    }
EOF
  fi
  cat <<EOF

    server_tokens off;
    # dev-стенд не индексируется
    add_header X-Robots-Tag "noindex, nofollow" always;
    client_max_body_size 20m;
    gzip on;
    gzip_proxied any;
    gzip_types text/css application/javascript application/json image/svg+xml application/manifest+json;

    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    # клиентский адрес — только тот, что видит nginx (API: TRUST_PROXY=1)
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_read_timeout 60s;

    location /v1/ {
        proxy_pass http://127.0.0.1:${API_PORT};
    }

    location = /admin {
        return 301 /admin/;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:${ADMIN_PORT};
    }
EOF
  if [[ "${mode}" == "https" ]]; then
    cat <<EOF

    # UI Mailpit (webroot /mail/, basic-auth самого Mailpit): письма стенда без SSH, наружу они не уходят
    location = /mail {
        return 301 /mail/;
    }

    location /mail/ {
        proxy_pass http://127.0.0.1:${MAIL_PORT};
        # proxy_set_header в location отменяет наследование заголовков server — они повторены
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$onbike_mail_connection;
        # WebSocket событий открыт всё время, пока открыт UI
        proxy_read_timeout 1h;
    }
EOF
  else
    cat <<EOF

    # без https пароль basic-auth шёл бы открытым текстом: UI Mailpit — только SSH-туннель (runbook «Почта»)
    location = /mail {
        return 404;
    }

    location /mail/ {
        return 404;
    }
EOF
  fi
  cat <<EOF

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
    }
}
EOF
}

# ставит vhost; при ошибке nginx -t возвращает прежний файл (или убирает свой) и падает
install_vhost() {
  local mode="$1" new backup had=0
  new="$(mktemp)"
  backup="$(mktemp)"
  render_vhost "${mode}" >"${new}"
  if sudo test -f "${SITE_FILE}"; then
    had=1
    # копия читается от root, пишется во временный файл текущего пользователя — так и задумано
    # shellcheck disable=SC2024
    sudo cat "${SITE_FILE}" >"${backup}"
    if cmp -s "${new}" "${backup}" && sudo test -L "${SITE_LINK}"; then
      log "nginx: vhost ${SITE_NAME} (${mode}) без изменений"
      rm -f "${new}" "${backup}"
      return 0
    fi
  fi
  sudo install -m 644 -o root -g root "${new}" "${SITE_FILE}"
  sudo ln -sfn "${SITE_FILE}" "${SITE_LINK}"
  if sudo nginx -t -q; then
    sudo systemctl reload nginx
    log "nginx: vhost ${SITE_NAME} (${mode}) установлен, reload"
    rm -f "${new}" "${backup}"
    return 0
  fi
  if [[ "${had}" -eq 1 ]]; then
    sudo install -m 644 -o root -g root "${backup}" "${SITE_FILE}"
  else
    sudo rm -f "${SITE_LINK}" "${SITE_FILE}"
  fi
  rm -f "${new}" "${backup}"
  sudo nginx -t -q || true
  die "nginx -t не прошёл с новым vhost ${SITE_NAME} — свой файл откачен, nginx не перезагружался"
}

# Какой файл отвечает на :<port> по умолчанию (запросы без SNI или с чужим Host): server с default_server,
# иначе первый по порядку включения (sites-enabled — по алфавиту). on-bike default быть не должен — иначе чужие
# запросы получат его сертификат и сайт; при таком раскладе — предупреждение, сам деплой этого не меняет.
default_vhost_file() {
  sudo nginx -T 2>/dev/null | awk -v port="$1" '
    /^# configuration file / { file = $4; sub(/:$/, "", file) }
    $1 == "listen" && $2 ~ ("(^|:)" port ";?$") {
      if (first == "") first = file
      if ($0 ~ /default_server/ && def == "") def = file
    }
    END { print (def != "" ? def : first) }'
}

check_not_default() {
  local port file
  for port in 80 443; do
    file="$(default_vhost_file "${port}")"
    if [[ "${file}" == "${SITE_LINK}" || "${file}" == "${SITE_FILE}" ]]; then
      warn "nginx: vhost ${SITE_NAME} — сервер по умолчанию для :${port} (нет default_server у соседей, ${SITE_NAME} первый по алфавиту) — runbook «nginx»"
    else
      # имя чужого файла в лог не выводится (лог Actions публичный)
      log "nginx: сервер по умолчанию для :${port} — не ${SITE_NAME}"
    fi
  done
}

cert_present() {
  sudo test -s "/etc/letsencrypt/live/${PUBLIC_HOST}/fullchain.pem" &&
    sudo test -s "/etc/letsencrypt/live/${PUBLIC_HOST}/privkey.pem"
}

# публичный IPv4 этого EC2 (IMDSv2); пусто — не определился
public_ip() {
  local token
  token="$(curl -fsS --max-time 2 -X PUT 'http://169.254.169.254/latest/api/token' \
    -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null)" || return 0
  curl -fsS --max-time 2 -H "X-aws-ec2-metadata-token: ${token}" \
    'http://169.254.169.254/latest/meta-data/public-ipv4' 2>/dev/null || true
}

# HTTP-01 дойдёт до этого nginx: проба через webroot по имени хоста
acme_probe() {
  local name value dir="${WEBROOT}/.well-known/acme-challenge" got=""
  name="on-bike-probe-$(openssl rand -hex 8)"
  value="$(openssl rand -hex 16)"
  sudo mkdir -p "${dir}"
  printf '%s' "${value}" | sudo tee "${dir}/${name}" >/dev/null
  sudo chmod 644 "${dir}/${name}"
  got="$(curl -fsS --max-time 10 "http://${PUBLIC_HOST}/.well-known/acme-challenge/${name}" 2>/dev/null)" || true
  sudo rm -f "${dir}/${name}"
  [[ "${got}" == "${value}" ]]
}

domain_points_here() {
  local resolved ip
  resolved="$(getent ahostsv4 "${PUBLIC_HOST}" | awk '{ print $1 }' | sort -u | tr '\n' ' ')"
  if [[ -z "${resolved}" ]]; then
    warn "DNS: ${PUBLIC_HOST} не резолвится — сертификат не выпускается, сайт только по http (после A-записи — повторный деплой)"
    return 1
  fi
  ip="$(public_ip)"
  if [[ -n "${ip}" && " ${resolved}" == *" ${ip} "* ]]; then
    log "DNS: ${PUBLIC_HOST} → этот сервер"
    return 0
  fi
  if acme_probe; then
    log "DNS: ${PUBLIC_HOST} — проба HTTP-01 через этот nginx прошла"
    return 0
  fi
  # адреса в лог не выводятся (лог Actions публичный); сверить вручную — runbook «TLS»
  warn "DNS: ${PUBLIC_HOST} ведёт не на этот сервер — сертификат не выпускается"
  return 1
}

issue_cert() {
  command -v certbot >/dev/null 2>&1 || {
    warn "certbot не установлен — сертификат не выпускается"
    return 1
  }
  local account=(--register-unsafely-without-email)
  [[ -z "${CERTBOT_EMAIL:-}" ]] || account=(--email "${CERTBOT_EMAIL}" --no-eff-email)
  log "certbot: выпуск сертификата ${PUBLIC_HOST} (webroot ${WEBROOT})"
  # --cert-name: lineage строго live/<хост> (без -0001), его и проверяет cert_present
  if sudo certbot certonly --webroot -w "${WEBROOT}" -d "${PUBLIC_HOST}" --cert-name "${PUBLIC_HOST}" \
    --non-interactive --agree-tos "${account[@]}" --keep-until-expiring \
    --deploy-hook 'systemctl reload nginx'; then
    return 0
  fi
  warn "certbot не выпустил сертификат ${PUBLIC_HOST} (лимит Let's Encrypt, DNS, порт 80?) — сайт пока только по http; следующий деплой попробует снова"
  return 1
}

configure_nginx() {
  command -v nginx >/dev/null 2>&1 || die "nginx на хосте не найден"
  if [[ -n "${PREVIOUS_HOST}" && "${PREVIOUS_HOST}" != "${PUBLIC_HOST}" ]]; then
    log "домен сменился: ${PREVIOUS_HOST} → ${PUBLIC_HOST}"
    if sudo test -d "/etc/letsencrypt/live/${PREVIOUS_HOST}"; then
      warn "старый сертификат ${PREVIOUS_HOST} остался — удалить: sudo certbot delete --cert-name ${PREVIOUS_HOST}"
    fi
  fi
  local tls=http
  if cert_present; then
    install_vhost https
    tls=https
  else
    # сначала :80 с ACME-путём — нужен и certbot, и пробе
    install_vhost http
    if domain_points_here && issue_cert && cert_present; then
      install_vhost https
      tls=https
    fi
  fi
  check_not_default
  echo "ONBIKE_TLS=${tls}"
}

PREVIOUS_HOST=""
ensure_env
if [[ "${ON_BIKE_SKIP_NGINX:-0}" == "1" ]]; then
  log "ON_BIKE_SKIP_NGINX=1: nginx и сертификат пропущены"
  echo "ONBIKE_TLS=skipped"
else
  configure_nginx
fi
