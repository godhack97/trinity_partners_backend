#!/usr/bin/env bash

# Entrypoint единого test application container. Здесь запускаются backend,
# Next.js portal и статическая admin-панель. Production scheduler намеренно не
# запускается, чтобы test не отправлял фоновые данные в Bitrix/SMTP.

set -Eeuo pipefail

# Миграции выполняются до открытия HTTP-портов. При ошибке entrypoint завершается,
# container не становится healthy, а deploy-скрипт возвращает предыдущую версию.
cd /app/nest-trinity-backend
NODE_ENV=prod node node_modules/typeorm/cli.js migration:run -d ./dist/config/typeorm.js

# Запускаем собранный NestJS backend на внутреннем порту 9131.
NODE_ENV=prod node dist/src/main.js &
BACKEND_PID=$!

# Next.js проксирует /api и /public во внутренний backend согласно build config.
cd /app/next-trinity-frontend
PORT=9130 npm run start &
PORTAL_PID=$!

# CRA admin является статической сборкой; serve слушает внутренний порт 9135.
serve -s /app/react-trinity-admin/build -l 9135 &
ADMIN_PID=$!

# При остановке container корректно посылаем SIGTERM всем дочерним процессам и
# ждём их завершения, чтобы Docker не оставлял незавершённые записи/соединения.
terminate() {
  kill -TERM "$BACKEND_PID" "$PORTAL_PID" "$ADMIN_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$PORTAL_PID" "$ADMIN_PID" 2>/dev/null || true
}
trap terminate INT TERM EXIT

# Единый container считается неисправным, если завершился любой из трёх сервисов.
# restart: unless-stopped затем перезапустит весь согласованный набор процессов.
wait -n "$BACKEND_PID" "$PORTAL_PID" "$ADMIN_PID"
exit 1
