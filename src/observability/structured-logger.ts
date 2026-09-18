import type { LoggerService } from "@nestjs/common";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import pino, { type Logger } from "pino";
import { createStream } from "rotating-file-stream";
import { requestContext } from "./request-context";
import { sanitizeForLogs } from "./sanitize";

export class StructuredLogger implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    const logDirectory = resolve(process.env.LOG_DIR || "logs");
    mkdirSync(logDirectory, { recursive: true, mode: 0o750 });
    const fileStream = createStream("backend.jsonl", {
      path: logDirectory,
      interval: "1d",
      intervalBoundary: true,
      intervalUTC: true,
      size: "50M",
      compress: "gzip",
      maxFiles: Number(process.env.LOG_RETENTION_FILES || 30),
      history: "backend-history.json",
      mode: 0o640,
    });

    this.logger = pino(
      {
        level: process.env.LOG_LEVEL || "info",
        base: {
          service: "trinity-backend",
          environment: process.env.NODE_ENV || "dev",
        },
        redact: {
          paths: [
            "password",
            "token",
            "authorization",
            "cookie",
            "req.headers.authorization",
            "req.headers.cookie",
          ],
          censor: "[REDACTED]",
        },
      },
      pino.multistream([
        { stream: process.stdout },
        { stream: fileStream },
      ]),
    );
  }

  log(message: unknown, context?: string) {
    this.write("info", message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write("error", trace ? { message, trace } : message, context);
  }

  warn(message: unknown, context?: string) {
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: string) {
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write("trace", message, context);
  }

  fatal(message: unknown, context?: string) {
    this.write("fatal", message, context);
  }

  private write(
    level: "fatal" | "error" | "warn" | "info" | "debug" | "trace",
    message: unknown,
    context?: string,
  ) {
    const requestId = requestContext.getStore()?.requestId;
    const sanitized = sanitizeForLogs(message);
    const details =
      sanitized && typeof sanitized === "object"
        ? sanitized
        : { message: sanitized };
    this.logger[level]({ context, requestId, ...details });
  }
}

