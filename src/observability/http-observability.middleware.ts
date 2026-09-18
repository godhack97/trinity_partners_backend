import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { requestContext } from "./request-context";
import { StructuredLogger } from "./structured-logger";
import type { MetricsService } from "./metrics.service";

const normalizePath = (path: string) =>
  path
    .split("?")[0]
    .replace(/\/[0-9]+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, "/:uuid");

export const httpObservabilityMiddleware = (
  logger: StructuredLogger,
  metrics: MetricsService,
) => (request: Request, response: Response, next: NextFunction) => {
  const incomingId = String(request.headers["x-request-id"] || "").trim();
  const requestId = /^[A-Za-z0-9._:-]{8,128}$/.test(incomingId)
    ? incomingId
    : randomUUID();
  const startedAt = process.hrtime.bigint();

  request.headers["x-request-id"] = requestId;
  response.setHeader("X-Request-Id", requestId);

  requestContext.run({ requestId }, () => {
    response.on("finish", () => {
      const durationSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      const route = normalizePath(request.originalUrl || request.url || "/");
      metrics.observeHttp(
        request.method,
        route,
        response.statusCode,
        durationSeconds,
      );
      logger.log(
        {
          event: "http_request",
          method: request.method,
          route,
          statusCode: response.statusCode,
          durationMs: Math.round(durationSeconds * 1000),
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        },
        "HTTP",
      );
    });
    next();
  });
};

