#!/usr/bin/env bash

# Production deployment запускается локально после commit и push. Исходники на
# сервер не копируются: сервер обновляет все репозитории через git pull.
# ВАЖНО: согласно требованиям этот сценарий намеренно НЕ создаёт backup.

set -Eeuo pipefail

# Подключаем общие проверки Git и генератор уникального image tag.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

# Все значения можно переопределить переменными окружения, но безопасные
# значения по умолчанию соответствуют текущему production-серверу.
DEPLOY_HOST="${DEPLOY_PROD_HOST:-trinity_parthners}"
REMOTE_WORKSPACE="${DEPLOY_PROD_WORKSPACE:-/var/www/trinity}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
DRY_RUN=false

# --dry-run проверяет Git, SSH, production Compose и env, но ничего не меняет.
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
elif [[ -n "${1:-}" ]]; then
  deploy_fail "usage: $0 [--dry-run]"
fi

# Не подключаемся к серверу для изменения состояния, пока локальный код не
# закоммичен и не опубликован во всех трёх origin/master.
echo "Checking that backend, portal and admin are committed and pushed"
deploy_assert_local_repositories_are_pushed "$DEPLOY_BRANCH"
IMAGE_TAG="$(deploy_image_tag prod)"

echo "Deploying production image ${IMAGE_TAG} to ${DEPLOY_HOST}"

# Передаём удалённому Bash только четыре безопасных аргумента. Секреты остаются
# в server-only /var/www/trinity/.env.docker и через SSH не передаются.
ssh "$DEPLOY_HOST" bash -s -- \
  "$REMOTE_WORKSPACE" "$DEPLOY_BRANCH" "$IMAGE_TAG" "$DRY_RUN" <<'REMOTE'
set -Eeuo pipefail

# Аргументы поступают из локальной части скрипта. Production env и Compose
# override всегда берутся из фиксированного server workspace.
WORKSPACE="$1"
BRANCH="$2"
IMAGE_TAG="$3"
DRY_RUN="$4"
ENV_FILE="${WORKSPACE}/.env.docker"
COMPOSE_OVERRIDE="${WORKSPACE}/docker-compose.prod.yml"
# switched показывает, успели ли мы начать cutover. previous_tag нужен только
# для автоматического возврата предыдущего application image.
switched=false
previous_tag=""

fail() {
  echo "Production deploy failed: $*" >&2
  exit 1
}

# Проверяем минимальный набор server dependencies до git pull и сборки.
for command_name in git docker curl flock grep sed; do
  command -v "$command_name" >/dev/null 2>&1 \
    || fail "missing command on server: ${command_name}"
done

[[ -f "$ENV_FILE" ]] || fail "missing ${ENV_FILE}"
[[ -f "${WORKSPACE}/docker-compose.yml" ]] || fail "missing production docker-compose.yml"
[[ -f "$COMPOSE_OVERRIDE" ]] || fail "missing ${COMPOSE_OVERRIDE}"

# flock не позволяет двум людям одновременно собирать и переключать production.
exec 9>/tmp/trinity-production-deploy.lock
flock -n 9 || fail "another production deployment is running"

# Единый массив исключает расхождение Compose-параметров между build, up,
# logs и rollback. Production override включает реальные SMTP/Bitrix-настройки.
compose=(
  docker compose
  --env-file "$ENV_FILE"
  -f "${WORKSPACE}/docker-compose.yml"
  -f "$COMPOSE_OVERRIDE"
)

# Обновляет один серверный репозиторий строго fast-forward. Tracked-изменения
# на сервере не затираются и не stash-ятся автоматически: deploy остановится.
sync_repository() {
  local directory="$1"
  local label="$2"
  local status
  local current_branch

  [[ -d "${directory}/.git" ]] || fail "missing ${label} repository: ${directory}"
  # Untracked runtime-файлы допустимы, но любое изменение tracked-файла требует
  # ручного разбора, чтобы не потерять server-only правки.
  status="$(git -C "$directory" status --porcelain --untracked-files=no)"
  [[ -z "$status" ]] || {
    printf '%s\n' "$status" >&2
    fail "tracked server changes found in ${label}"
  }
  current_branch="$(git -C "$directory" branch --show-current)"
  [[ "$current_branch" == "$BRANCH" ]] \
    || fail "${label} is on ${current_branch}, expected ${BRANCH}"

  # --ff-only запрещает неявный merge commit непосредственно на сервере.
  git -C "$directory" pull --ff-only origin "$BRANCH"
}

# Ждём не просто открытый TCP-порт, а readiness backend с проверкой БД и диска.
wait_for_ready() {
  local attempt
  for attempt in $(seq 1 60); do
    if curl -fsS http://127.0.0.1:9131/health/ready >/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# Проверяет точный HTTP status внешнего домена через Nginx и TLS.
assert_status() {
  local expected="$1"
  local url="$2"
  local actual
  actual="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
  [[ "$actual" == "$expected" ]] \
    || fail "${url} returned ${actual}, expected ${expected}"
}

# Проверяет все Next.js CSS/JS assets, указанные на странице входа. Эта проверка
# защищает от ситуации, когда HTML=200, но Nginx отдаёт статику из старой папки.
check_next_assets() {
  local page
  local asset
  local -a assets=()

  # Curl использует ASCII punycode: это тот же домен партнер.тринити.рф, но без
  # зависимости от IDN-возможностей установленной на сервере версии libcurl.
  page="$(curl -fsS https://xn--80akxggcl.xn--h1aaasnle.xn--p1ai/sign/in)"
  # Получаем уникальные относительные ссылки на versioned Next.js assets.
  mapfile -t assets < <(
    printf '%s' "$page" \
      | grep -oE '(href|src)="/_next/static/[^"]+"' \
      | sed -E 's/^(href|src)="//;s/"$//' \
      | sort -u
  )
  ((${#assets[@]} > 0)) || fail "portal HTML does not reference Next.js assets"

  # Каждый asset запрашивается через внешний production hostname.
  for asset in "${assets[@]}"; do
    curl -fsS -o /dev/null "https://xn--80akxggcl.xn--h1aaasnle.xn--p1ai${asset}" \
      || fail "portal asset is unavailable: ${asset}"
  done
  echo "Verified ${#assets[@]} production portal assets"
}

# Если ошибка произошла после начала переключения, возвращаем предыдущий image.
# База не восстанавливается: миграции должны быть обратно совместимыми. Поэтому
# опасные/разрушающие миграции требуют отдельного согласованного плана релиза.
rollback() {
  local exit_code=$?
  trap - EXIT

  if [[ "$exit_code" -ne 0 && "$switched" == "true" && -n "$previous_tag" ]]; then
    echo "Deploy failed after cutover; restoring application image ${previous_tag}" >&2
    export TRINITY_IMAGE_TAG="$previous_tag"
    # --no-deps меняет только trinity-app и не перезапускает MariaDB/monitoring.
    "${compose[@]}" up -d --no-deps trinity-app </dev/null || true
    wait_for_ready || true
  fi
  exit "$exit_code"
}
trap rollback EXIT

# TRINITY_IMAGE_TAG подставляется Compose в image: trinity-partners:<tag>.
cd "$WORKSPACE"
export TRINITY_IMAGE_TAG="$IMAGE_TAG"
# До git pull валидируем уже установленную production-конфигурацию и секреты.
"${compose[@]}" config --quiet </dev/null

# В dry-run серверное состояние не меняется: нет pull, build или restart.
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Production dry run passed; no server state was changed"
  exit 0
fi

# Все три репозитория обновляются до уже проверенного origin/master.
sync_repository "${WORKSPACE}/nest-trinity-backend" backend
sync_repository "${WORKSPACE}/next-trinity-frontend" portal
sync_repository "${WORKSPACE}/react-trinity-admin" admin

# Запоминаем текущий tag перед сборкой; это точка возврата при неудачном smoke.
previous_image="$(docker inspect -f '{{.Config.Image}}' trinity-trinity-app-1 2>/dev/null || true)"
if [[ "$previous_image" == trinity-partners:* ]]; then
  previous_tag="${previous_image#trinity-partners:}"
fi

echo "Building ${IMAGE_TAG}"
# --pull обновляет базовые images; сборка ещё не затрагивает работающий portal.
"${compose[@]}" build --pull trinity-app </dev/null

echo "Switching production application container"
# Флаг устанавливается ДО up: даже частично неудавшийся recreate должен вызвать
# rollback. MariaDB и monitoring не пересоздаются благодаря --no-deps.
switched=true
"${compose[@]}" up -d --no-deps trinity-app </dev/null

# При timeout выводим последние логи перед автоматическим rollback.
if ! wait_for_ready; then
  "${compose[@]}" logs --tail=250 trinity-app </dev/null || true
  fail "backend readiness check timed out"
fi

# Полный внешний smoke: основные приложения, закрытые служебные endpoints и
# versioned frontend assets. Только после этих проверок deploy считается готовым.
assert_status 200 https://partner-api.trinity.ru/health/live
assert_status 200 https://partner-api.trinity.ru/health/ready
assert_status 200 https://xn--80akxggcl.xn--h1aaasnle.xn--p1ai/sign/in
# Старый адрес должен только перенаправлять на новый canonical portal.
assert_status 308 https://partner.trinity.ru/sign/in
assert_status 200 https://partner-admin.trinity.ru/
assert_status 401 https://partner-api.trinity.ru/api/docs
assert_status 403 https://partner-api.trinity.ru/metrics
check_next_assets

# Сохраняем диагностический вывод успешного релиза в terminal оператора.
"${compose[@]}" ps </dev/null
"${compose[@]}" logs --tail=100 trinity-app </dev/null

# Отключаем rollback только после всех внешних проверок.
switched=false
trap - EXIT
echo "Production deploy completed: ${IMAGE_TAG}"
REMOTE
