# Отдельный build stage backend обеспечивает воспроизводимый npm ci и не
# переносит компилятор/TypeScript devDependencies в финальный runtime image.
FROM node:20-bookworm-slim AS backend-build
WORKDIR /build/backend
COPY nest-trinity-backend/package.json nest-trinity-backend/package-lock.json ./
COPY nest-trinity-backend/vendor ./vendor
RUN --mount=type=cache,id=trinity-test-backend-npm,target=/root/.npm npm ci --no-audit --no-fund
COPY nest-trinity-backend/ ./
RUN npm run build:prod && npm prune --omit=dev --no-audit --no-fund

# Portal собирается production-командой Next.js, но получает test Sentry env.
# API остаётся относительным /api и проходит через Next rewrite внутри container.
FROM node:20-bookworm-slim AS portal-build
WORKDIR /build/portal
ARG NEXT_PUBLIC_BACKEND_URL=/api
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT=test
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0
COPY next-trinity-frontend/package.json next-trinity-frontend/package-lock.json ./
COPY next-trinity-frontend/vendor ./vendor
RUN --mount=type=cache,id=trinity-test-portal-npm,target=/root/.npm npm ci --no-audit --no-fund
COPY next-trinity-frontend/ ./
RUN cp src/constants/secret.example.ts src/constants/secret.ts
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

# Admin — отдельная CRA-сборка. Test API origin встраивается на этапе build,
# поэтому браузер всегда обращается к partner-api-test.trinity.ru.
FROM node:20-bookworm-slim AS admin-build
ARG ADMIN_API_ORIGIN
ARG REACT_APP_SENTRY_DSN=
ARG REACT_APP_SENTRY_ENVIRONMENT=test
ARG REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0
WORKDIR /build/admin
COPY react-trinity-admin/package.json react-trinity-admin/package-lock.json ./
RUN --mount=type=cache,id=trinity-test-admin-npm,target=/root/.npm npm ci --no-audit --no-fund --ignore-scripts
COPY react-trinity-admin/ ./
RUN test -n "${ADMIN_API_ORIGIN}" \
  && cp src/constants/secret.example.js src/constants/secret.js \
  && sed -i "s#__ADMIN_API_ORIGIN__#${ADMIN_API_ORIGIN}#" src/constants/secret.js \
  && GENERATE_SOURCEMAP=false npx react-app-rewired build

# Финальный stage содержит только runtime Node, curl для healthcheck, tini для
# корректной обработки сигналов и serve для admin static files.
FROM node:20-bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tini \
  && npm install --global serve@14 \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Копируем три уже собранных приложения из изолированных build stages.
COPY --from=backend-build /build/backend ./nest-trinity-backend
COPY --from=portal-build /build/portal ./next-trinity-frontend
COPY --from=admin-build /build/admin/build ./react-trinity-admin/build
COPY nest-trinity-backend/deploy/docker/docker-entrypoint.test.sh ./ops/docker-entrypoint.sh

# Runtime работает непривилегированным пользователем node. Заранее создаём
# writable logs directory и передаём node владение файлами приложения.
RUN chmod 0755 ./ops/docker-entrypoint.sh \
  && mkdir -p /app/nest-trinity-backend/logs \
  && chown -R node:node /app
USER node
ENV NODE_ENV=prod NEXT_TELEMETRY_DISABLED=1

# Порты только документируются здесь; на host они публикуются Compose строго на
# 127.0.0.1, после чего наружу доступны исключительно через Nginx/TLS.
EXPOSE 9130 9131 9135

# Пользовательские/test runtime-файлы переживают замену application container.
VOLUME ["/app/nest-trinity-backend/public", "/app/nest-trinity-backend/upload", "/app/nest-trinity-backend/logs"]

# Readiness проверяет backend, соединение с test DB и минимальный свободный диск.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -fsS http://127.0.0.1:9131/health/ready || exit 1
ENTRYPOINT ["/usr/bin/tini", "--", "/app/ops/docker-entrypoint.sh"]
