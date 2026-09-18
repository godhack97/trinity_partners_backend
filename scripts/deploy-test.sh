#!/usr/bin/env bash

# Test deployment запускается локально после commit и push. Он создаёт полностью
# независимый Docker Compose project `trinity-test`: отдельные MariaDB и volumes,
# отдельные cookies и порты 9140/9141/9145.
# ВАЖНО: этот сценарий намеренно НЕ создаёт backup.

set -Eeuo pipefail

# Подключаем общую Git-проверку и генерацию уникального image tag.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

# Значения по умолчанию соответствуют текущему test-каталогу на сервере.
DEPLOY_HOST="${DEPLOY_TEST_HOST:-trinity_parthners}"
REMOTE_WORKSPACE="${DEPLOY_TEST_WORKSPACE:-/var/www/trinity-test}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
DRY_RUN=false

# --dry-run проверяет Git/SSH/Compose/env без сборки и переключения test-доменов.
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ -n "${1:-}" ]]; then
  deploy_fail "usage: $0 [--dry-run]"
fi

# Deploy разрешён только для полностью закоммиченных и опубликованных SHA.
echo "Checking that backend, portal and admin are committed and pushed"
deploy_assert_local_repositories_are_pushed "$DEPLOY_BRANCH"
IMAGE_TAG="$(deploy_image_tag test)"

echo "Deploying test image ${IMAGE_TAG} to ${DEPLOY_HOST}"

# Секреты не передаются с рабочего компьютера: test env хранится только на
# сервере и при первом запуске автоматически генерируется там.
ssh "$DEPLOY_HOST" bash -s -- \
  "$REMOTE_WORKSPACE" "$DEPLOY_BRANCH" "$IMAGE_TAG" "$DRY_RUN" <<'REMOTE'
set -Eeuo pipefail

# Получаем только безопасные deploy-параметры. Compose-файл поставляется через
# backend Git-репозиторий, а .env.docker является server-only файлом.
WORKSPACE="$1"
BRANCH="$2"
IMAGE_TAG="$3"
DRY_RUN="$4"
ENV_FILE="${WORKSPACE}/.env.docker"
COMPOSE_FILE="${WORKSPACE}/nest-trinity-backend/deploy/docker/docker-compose.test.yml"
# Эти переменные описывают состояние cutover и позволяют вернуть предыдущий
# Docker image либо старые PM2 test-процессы при первой неудачной выкладке.
switched=false
previous_tag=""
declare -a stopped_pm2=()

fail() {
  echo "Test deploy failed: $*" >&2
  exit 1
}

# openssl нужен только для безопасной первичной генерации test secrets.
for command_name in git docker curl flock grep sed pm2 node openssl; do
  command -v "$command_name" >/dev/null 2>&1 \
    || fail "missing command on server: ${command_name}"
done

# Отдельная блокировка исключает одновременные test deploy, но не мешает prod.
exec 9>/tmp/trinity-test-docker-deploy.lock
flock -n 9 || fail "another test deployment is running"

# Фиксированное имя project гарантирует стабильные имена контейнеров, сети и
# test volumes независимо от текущего каталога запуска.
compose=(
  docker compose
  -p trinity-test
  --project-directory "$WORKSPACE"
  --env-file "$ENV_FILE"
  -f "$COMPOSE_FILE"
)

# Обновляет server checkout только fast-forward. Локальные tracked-изменения на
# сервере не сбрасываются автоматически и останавливают deploy.
sync_repository() {
  local directory="$1"
  local label="$2"
  local status
  local current_branch

  [[ -d "${directory}/.git" ]] || fail "missing ${label} repository: ${directory}"
  # Runtime/untracked-файлы не мешают, но tracked-файлы должны совпадать с Git.
  status="$(git -C "$directory" status --porcelain --untracked-files=no)"
  [[ -z "$status" ]] || {
    printf '%s\n' "$status" >&2
    fail "tracked server changes found in ${label}"
  }
  current_branch="$(git -C "$directory" branch --show-current)"
  [[ "$current_branch" == "$BRANCH" ]] \
    || fail "${label} is on ${current_branch}, expected ${BRANCH}"

  # --ff-only не разрешает создавать merge commit во время выкладки.
  git -C "$directory" pull --ff-only origin "$BRANCH"
}

# Создаёт server-only test env ровно один раз. Hex-строки не требуют кавычек и
# безопасно читаются dotenv/Compose. Существующий env никогда не перезаписывается.
initialize_test_environment() {
  local database_password
  local root_password
  local captcha_secret
  local csrf_secret
  local metrics_token

  if [[ -f "$ENV_FILE" ]]; then
    chmod 0600 "$ENV_FILE"
    return 0
  fi

  echo "Creating isolated test Docker environment: ${ENV_FILE}"
  database_password="$(openssl rand -hex 32)"
  root_password="$(openssl rand -hex 32)"
  captcha_secret="$(openssl rand -hex 48)"
  csrf_secret="$(openssl rand -hex 48)"
  metrics_token="$(openssl rand -hex 32)"

  umask 077
  printf '%s\n' \
    'DATABASE_NAME=trinity_test' \
    'DATABASE_USERNAME=trinity_test' \
    "DATABASE_PASSWORD=${database_password}" \
    "DATABASE_ROOT_PASSWORD=${root_password}" \
    "LOGIN_CAPTCHA_SECRET=${captcha_secret}" \
    "CSRF_SECRET=${csrf_secret}" \
    "METRICS_TOKEN=${metrics_token}" \
    'AUTH_SESSION_TTL_DAYS=7' \
    'TRINITY_IMAGE_TAG=test-local' \
    'PORTAL_PORT=9140' \
    'BACKEND_PORT=9141' \
    'ADMIN_PORT=9145' \
    'ADMIN_API_ORIGIN=https://partner-api-test.trinity.ru' \
    'NEXT_PUBLIC_SENTRY_DSN=' \
    'REACT_APP_SENTRY_DSN=' \
    'SENTRY_DSN=' \
    'SENTRY_TRACES_SAMPLE_RATE=0' \
    'RATE_LIMIT_TTL_MS=60000' \
    'RATE_LIMIT_MAX=300' \
    'LOGIN_RATE_LIMIT_MAX=30' \
    'LOG_LEVEL=info' \
    'LOG_RETENTION_FILES=14' \
    'READY_DISK_MIN_FREE_BYTES=1073741824' \
    >"$ENV_FILE"
  chmod 0600 "$ENV_FILE"
}

# Readiness подтверждает соединение backend с test MariaDB и свободное место.
wait_for_ready() {
  local attempt
  for attempt in $(seq 1 60); do
    if curl -fsS http://127.0.0.1:9141/health/ready >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Проверяет точный HTTP status через реальные test Nginx/TLS-домены.
assert_status() {
  local expected="$1"
  local url="$2"
  local actual
  actual="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
  [[ "$actual" == "$expected" ]] \
    || fail "${url} returned ${actual}, expected ${expected}"
}

# Загружает каждый Next.js asset, упомянутый test-страницей входа. Поэтому
# успешный HTML без CSS/JS не может быть ошибочно принят за рабочий релиз.
check_next_assets() {
  local page
  local asset
  local -a assets=()

  page="$(curl -fsS https://partner-test.trinity.ru/sign/in)"
  # Извлекаем и дедуплицируем versioned CSS/JS URLs.
  mapfile -t assets < <(
    printf '%s' "$page" \
      | grep -oE '(href|src)="/_next/static/[^"]+"' \
      | sed -E 's/^(href|src)="//;s/"$//' \
      | sort -u
  )
  ((${#assets[@]} > 0)) || fail "test portal HTML does not reference Next.js assets"

  # Проверяем assets именно через внешний test hostname.
  for asset in "${assets[@]}"; do
    curl -fsS -o /dev/null "https://partner-test.trinity.ru${asset}" \
      || fail "test portal asset is unavailable: ${asset}"
  done
  echo "Verified ${#assets[@]} test portal assets"
}

# Останавливает только три legacy PM2 test-процесса после успешной сборки и
# запуска test MariaDB. Production PM2/Docker процессы эта функция не затрагивает.
stop_test_pm2() {
  local process_name
  for process_name in \
    "Trinity Test: backend" \
    "Trinity Test: frontend" \
    "Trinity Test: admin panel 9145"; do
    # Сохраняем только реально работавшие процессы, чтобы rollback не запускал
    # то, что оператор ранее остановил вручную.
    if pm2 describe "$process_name" >/dev/null 2>&1 \
      && [[ "$(pm2 jlist | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const n=process.argv[1];const p=JSON.parse(d).find(x=>x.name===n);process.stdout.write(p?.pm2_env?.status||"")})' "$process_name")" == "online" ]]; then
      pm2 stop "$process_name" </dev/null >/dev/null
      stopped_pm2+=("$process_name")
    fi
  done
}

# После начала cutover возвращает предыдущий test Docker image. При первой
# Docker-выкладке предыдущего image ещё нет, поэтому возвращаются сохранённые
# PM2 test-процессы. Production окружение rollback никогда не затрагивает.
rollback() {
  local exit_code=$?
  local process_name
  trap - EXIT

  if [[ "$exit_code" -ne 0 && "$switched" == "true" ]]; then
    if [[ -n "$previous_tag" ]]; then
      echo "Test deploy failed after cutover; restoring image ${previous_tag}" >&2
      export TRINITY_IMAGE_TAG="$previous_tag"
      # --no-deps сохраняет test MariaDB запущенной и меняет только приложение.
      "${compose[@]}" up -d --no-deps trinity-app </dev/null || true
      wait_for_ready || true
    else
      "${compose[@]}" stop trinity-app </dev/null >/dev/null 2>&1 || true
      for process_name in "${stopped_pm2[@]}"; do
        pm2 start "$process_name" </dev/null >/dev/null 2>&1 || true
      done
    fi
  fi
  exit "$exit_code"
}
trap rollback EXIT

# Сначала server checkout получает новые, уже опубликованные deploy-файлы.
# В dry-run git pull намеренно не выполняется.
if [[ "$DRY_RUN" != "true" ]]; then
  sync_repository "${WORKSPACE}/nest-trinity-backend" backend
  sync_repository "${WORKSPACE}/next-trinity-frontend" portal
  sync_repository "${WORKSPACE}/react-trinity-admin" admin
fi

# Первый запуск сам создаёт изолированный .env.docker со случайными secrets.
# Последующие запуски используют тот же файл и не меняют пароль test MariaDB.
[[ -f "$COMPOSE_FILE" ]] || fail "missing ${COMPOSE_FILE} after repository update"
if [[ "$DRY_RUN" != "true" ]]; then
  initialize_test_environment
fi
[[ -f "$ENV_FILE" ]] || fail "missing ${ENV_FILE}; run the first test deploy without --dry-run to initialize it"

# Эти переменные нужны Compose для build context и уникального image tag.
cd "$WORKSPACE"
export TRINITY_WORKSPACE_DIR="$WORKSPACE"
export TRINITY_IMAGE_TAG="$IMAGE_TAG"
# Полная интерполяция Compose выявляет отсутствующие env до build/cutover.
"${compose[@]}" config --quiet </dev/null

# Dry-run завершает работу до build, остановки PM2 или запуска контейнеров.
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Test dry run passed; no server state was changed"
  exit 0
fi

# Если test уже работал в Docker, сохраняем его image tag для rollback.
previous_image="$(docker inspect -f '{{.Config.Image}}' trinity-test-trinity-app-1 2>/dev/null || true)"
if [[ "$previous_image" == trinity-partners-test:* ]]; then
  previous_tag="${previous_image#trinity-partners-test:}"
fi

echo "Building ${IMAGE_TAG}"
# Сборка происходит, пока текущий test-контур продолжает обслуживать домены.
"${compose[@]}" build --pull trinity-app </dev/null
# Test MariaDB запускается заранее и не публикует порт 3306 на host.
"${compose[@]}" up -d mariadb </dev/null

# Legacy PM2 освобождает 9140/9141/9145 только после успешной сборки.
stop_test_pm2
echo "Switching test application container"
# Флаг ставится до recreate, чтобы любая частичная ошибка активировала rollback.
switched=true
"${compose[@]}" up -d --no-deps trinity-app </dev/null

# При timeout печатаем container logs, затем EXIT trap выполнит rollback.
if ! wait_for_ready; then
  "${compose[@]}" logs --tail=250 trinity-app </dev/null || true
  fail "test backend readiness check timed out"
fi

# Полный smoke выполняется через test-домены. Swagger и metrics должны оставаться
# закрытыми так же, как на production.
assert_status 200 https://partner-api-test.trinity.ru/health/live
assert_status 200 https://partner-api-test.trinity.ru/health/ready
assert_status 200 https://partner-test.trinity.ru/sign/in
assert_status 200 https://admin-test.trinity.ru/
assert_status 401 https://partner-api-test.trinity.ru/api/docs
assert_status 403 https://partner-api-test.trinity.ru/metrics
check_next_assets

# Выводим финальное состояние и логи, затем сохраняем остановленное состояние
# legacy PM2, чтобы после reboot порты не были заняты снова.
"${compose[@]}" ps </dev/null
"${compose[@]}" logs --tail=100 trinity-app </dev/null
pm2 save </dev/null >/dev/null

# Rollback отключается только после всех внешних проверок.
switched=false
trap - EXIT
echo "Test deploy completed: ${IMAGE_TAG}"
REMOTE
