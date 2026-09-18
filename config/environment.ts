import * as Joi from "joi";

export const runtimeEnvironment = () =>
  String(process.env.NODE_ENV || "dev").trim().toLowerCase();

export const environmentFilePaths = () => {
  const environment = runtimeEnvironment();
  return [`.env.${environment}`, ".env"];
};

const booleanValue = Joi.alternatives()
  .try(Joi.boolean(), Joi.string().valid("true", "false"))
  .required();

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("dev", "prod", "test", "local", "development", "production")
    .default("dev"),
  PORT: Joi.number().port().default(9131),
  HOSTNAME: Joi.string().hostname().required(),
  FRONTEND_HOSTNAME: Joi.string().required(),
  BACKEND_HOSTNAME: Joi.string().required(),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().required(),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow("").required(),
  DATABASE_NAME: Joi.string().required(),

  EMAIL_HOST: Joi.string().required(),
  EMAIL_PORT: Joi.number().port().required(),
  EMAIL_USERNAME: Joi.string().required(),
  EMAIL_PASSWORD: Joi.string().required(),
  EMAIL_SECURE: booleanValue,
  EMAIL_DEBUG: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .default(false),

  BITRIX24_WEBHOOK_URL: Joi.string().uri({ scheme: ["http", "https"] }).required(),
  LOGIN_CAPTCHA_SECRET: Joi.string().min(32).required(),
  CSRF_SECRET: Joi.string().min(32).required(),
  AUTH_SESSION_TTL_DAYS: Joi.number().integer().min(1).max(90).required(),
  SESSION_COOKIE_NAME: Joi.string().default("trinity_session"),
  CSRF_COOKIE_NAME: Joi.string().default("trinity_csrf"),
  CSRF_COOKIE_DOMAIN: Joi.string().allow("").default(""),
  COOKIE_SECURE: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .default(runtimeEnvironment() === "prod"),
  ALLOWED_ORIGINS: Joi.string().default(
    "https://xn--80akxggcl.xn--h1aaasnle.xn--p1ai,https://partner-admin.trinity.ru",
  ),

  RATE_LIMIT_TTL_MS: Joi.number().integer().min(1000).default(60_000),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(120),
  LOGIN_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(10),
  SCHEDULED_JOBS_ENABLED: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .default(true),

  LOG_LEVEL: Joi.string()
    .valid("fatal", "error", "warn", "info", "debug", "trace", "silent")
    .default("info"),
  LOG_DIR: Joi.string().default("logs"),
  LOG_RETENTION_FILES: Joi.number().integer().min(2).max(365).default(30),
  METRICS_TOKEN: Joi.string().min(24).allow("").default(""),
  SENTRY_DSN: Joi.string().uri({ scheme: ["http", "https"] }).allow("").default(""),
  SENTRY_ENVIRONMENT: Joi.string().default(runtimeEnvironment()),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),
  UPLOAD_DIR: Joi.string().default("public"),
  READY_DISK_MIN_FREE_BYTES: Joi.number()
    .integer()
    .min(10 * 1024 * 1024)
    .default(1024 * 1024 * 1024),
  COOKIE_POLICY_VERSION: Joi.string().default("2026-09-17"),
  PRIVACY_POLICY_VERSION: Joi.string().default("2026-09-17"),
  USER_AGREEMENT_VERSION: Joi.string().default("2026-09-17"),
  FEDERAL_LAWS_POLICY_VERSION: Joi.string().default("2026-09-17"),
});
