#!/usr/bin/env bash

# Общие функции для локальных deploy-скриптов production и test.
# Этот файл не запускается самостоятельно: его подключают deploy-prod.sh и
# deploy-test.sh через source.

# -E сохраняет ERR trap внутри функций, -e останавливает сценарий при ошибке,
# -u запрещает неинициализированные переменные, pipefail отслеживает ошибки
# внутри pipeline, а не только код завершения последней команды.
set -Eeuo pipefail

# Определяем workspace относительно расположения backend-репозитория. Значение
# можно переопределить для CI или нестандартного расположения исходников.
DEPLOY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_WORKSPACE_DIR="${TRINITY_WORKSPACE_DIR:-$(cd "${DEPLOY_SCRIPT_DIR}/../.." && pwd)}"

# Завершает deploy единообразным сообщением об ошибке.
deploy_fail() {
  echo "Deploy failed: $*" >&2
  exit 1
}

# Проверяет наличие обязательной локальной команды до изменения сервера.
deploy_require_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1 \
    || deploy_fail "missing command: ${command_name}"
}

# Проверяет главный контракт процесса выкладки: все изменения уже должны быть
# закоммичены и отправлены в origin. Проверяются сразу три независимых Git-
# репозитория, потому что один Docker image содержит backend, portal и admin.
deploy_assert_local_repositories_are_pushed() {
  local branch="$1"
  local label
  local directory
  local local_head
  local remote_head
  local status

  deploy_require_command git
  deploy_require_command ssh

  # Формат списка — "понятное имя|абсолютный путь". Here-document позволяет
  # обойтись без глобальных массивов и одинаково работает в Bash 4+.
  while IFS='|' read -r label directory; do
    [[ -d "${directory}/.git" ]] \
      || deploy_fail "${label} repository is missing: ${directory}"

    # Любой tracked или untracked файл означает, что deploy не воспроизводим
    # через Git. В таком состоянии сценарий намеренно ничего не выкладывает.
    status="$(git -C "$directory" status --porcelain)"
    [[ -z "$status" ]] || {
      printf '%s\n' "$status" >&2
      deploy_fail "${label} has uncommitted or untracked changes"
    }

    # Обновляем только сведения об origin, не меняя рабочее дерево разработчика.
    git -C "$directory" fetch --quiet origin "$branch"
    local_head="$(git -C "$directory" rev-parse HEAD)"
    remote_head="$(git -C "$directory" rev-parse "origin/${branch}")"

    # Равенство SHA доказывает, что текущий commit уже доступен серверу через
    # обычный git pull --ff-only; копирование исходников по SCP не требуется.
    [[ "$local_head" == "$remote_head" ]] \
      || deploy_fail "${label} HEAD is not equal to origin/${branch}; commit, pull if needed, and push first"
  done <<EOF
backend|${DEPLOY_WORKSPACE_DIR}/nest-trinity-backend
portal|${DEPLOY_WORKSPACE_DIR}/next-trinity-frontend
admin|${DEPLOY_WORKSPACE_DIR}/react-trinity-admin
EOF
}

# Формирует неизменяемый и читаемый тег Docker image. В него входят окружение,
# UTC-время и короткие SHA всех трёх репозиториев. Такой тег позволяет точно
# определить содержимое image и выполнить автоматический rollback.
deploy_image_tag() {
  local environment="$1"
  local timestamp
  local backend_revision
  local portal_revision
  local admin_revision

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backend_revision="$(git -C "${DEPLOY_WORKSPACE_DIR}/nest-trinity-backend" rev-parse --short=8 HEAD)"
  portal_revision="$(git -C "${DEPLOY_WORKSPACE_DIR}/next-trinity-frontend" rev-parse --short=8 HEAD)"
  admin_revision="$(git -C "${DEPLOY_WORKSPACE_DIR}/react-trinity-admin" rev-parse --short=8 HEAD)"

  printf '%s-%s-b%s-f%s-a%s' \
    "$environment" "$timestamp" "$backend_revision" "$portal_revision" "$admin_revision"
}
