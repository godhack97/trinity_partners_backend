import { createHash, randomBytes } from "crypto";

const DEFAULT_SESSION_TTL_DAYS = 30;
const MAX_SESSION_TTL_DAYS = 90;

export const createSessionToken = () => randomBytes(48).toString("base64url");

export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const getSessionExpiresAt = () => {
  const configuredDays = Number(process.env.AUTH_SESSION_TTL_DAYS);
  const ttlDays = Number.isFinite(configuredDays)
    ? Math.min(Math.max(Math.trunc(configuredDays), 1), MAX_SESSION_TTL_DAYS)
    : DEFAULT_SESSION_TTL_DAYS;

  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
};

export const normalizeSessionClientId = (clientId?: string) => {
  const value = String(clientId || "")
    .trim()
    .toLowerCase();

  if (
    value === "web:admin" ||
    value.includes("9135") ||
    value.includes("admin")
  ) {
    return "web:admin";
  }

  return "web:portal";
};
