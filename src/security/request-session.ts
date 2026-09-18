import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

export const DEFAULT_SESSION_COOKIE_NAME = "trinity_session";
export const DEFAULT_CSRF_COOKIE_NAME = "trinity_csrf";

export type SessionSource = "bearer" | "cookie";

export type RequestSession = {
  token: string;
  source: SessionSource;
};

export const sessionCookieName = () =>
  process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME;

export const csrfCookieName = () =>
  process.env.CSRF_COOKIE_NAME || DEFAULT_CSRF_COOKIE_NAME;

export const extractRequestSession = (request: Request): RequestSession | null => {
  const authorization = String(request.headers.authorization || "");
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) {
    return { token: bearerMatch[1].trim(), source: "bearer" };
  }

  const token = request.cookies?.[sessionCookieName()];
  return token ? { token: String(token), source: "cookie" } : null;
};

export const createCsrfToken = (sessionToken: string) =>
  createHmac("sha256", process.env.CSRF_SECRET || "")
    .update(sessionToken)
    .digest("base64url");

export const csrfTokenMatchesSession = (
  sessionToken: string,
  submittedToken: string,
  cookieToken: string,
) => {
  if (!submittedToken || !cookieToken || submittedToken !== cookieToken) {
    return false;
  }

  const expected = Buffer.from(createCsrfToken(sessionToken));
  const submitted = Buffer.from(submittedToken);
  return (
    expected.length === submitted.length &&
    timingSafeEqual(new Uint8Array(expected), new Uint8Array(submitted))
  );
};

