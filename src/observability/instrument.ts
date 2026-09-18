import * as Sentry from "@sentry/nestjs";
import { config as loadEnvironment } from "dotenv";
import { environmentFilePaths } from "../../config/environment";
import { sanitizeForLogs } from "./sanitize";

for (const path of [...environmentFilePaths()].reverse()) {
  loadEnvironment({ path, override: true, quiet: true });
}

const dsn = process.env.SENTRY_DSN?.trim();

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "dev",
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  sendDefaultPii: false,
  beforeSend(event) {
    return sanitizeForLogs(event) as typeof event;
  },
});
