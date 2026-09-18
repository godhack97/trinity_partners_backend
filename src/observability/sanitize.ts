const SENSITIVE_KEY =
  /(?:authorization|cookie|password|passwd|secret|token|api[-_]?key|phone|email)/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
const PHONE_PATTERN = /(?<!\d)(?:\+?7|8)?[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi;

export const maskSensitiveString = (value: string) =>
  value
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(EMAIL_PATTERN, "[EMAIL]")
    .replace(PHONE_PATTERN, "[PHONE]");

export const sanitizeForLogs = (value: unknown, depth = 0): unknown => {
  if (depth > 6) return "[MAX_DEPTH]";
  if (typeof value === "string") return maskSensitiveString(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: maskSensitiveString(value.message),
      stack: value.stack ? maskSensitiveString(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogs(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key)
          ? "[REDACTED]"
          : sanitizeForLogs(item, depth + 1),
      ]),
    );
  }
  return value;
};

