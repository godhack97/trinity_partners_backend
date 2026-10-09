export const parseAllowedOrigins = (value?: string): string[] =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
