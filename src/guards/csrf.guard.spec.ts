import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "@decorators/Public";
import { CsrfGuard } from "./csrf.guard";
import { createCsrfToken } from "@app/security/request-session";

const createContext = (
  request: Record<string, unknown>,
  options: { isPublic?: boolean } = {},
) => {
  class TestController {}
  const handler = () => undefined;

  if (options.isPublic) {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  }

  return {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

describe("CsrfGuard", () => {
  const originalSecret = process.env.CSRF_SECRET;
  const guard = new CsrfGuard(new Reflector());

  beforeAll(() => {
    process.env.CSRF_SECRET = "test-csrf-secret-with-at-least-32-characters";
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.CSRF_SECRET;
    else process.env.CSRF_SECRET = originalSecret;
  });

  it("allows a public login request even when a stale session cookie exists", () => {
    const context = createContext(
      {
        method: "POST",
        headers: {},
        cookies: { trinity_session: "stale-session" },
      },
      { isPublic: true },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects a protected cookie-authenticated mutation without a CSRF token", () => {
    const context = createContext({
      method: "POST",
      headers: {},
      cookies: { trinity_session: "session-token" },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows a protected cookie-authenticated mutation with a matching token", () => {
    const sessionToken = "session-token";
    const csrfToken = createCsrfToken(sessionToken);
    const context = createContext({
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      cookies: {
        trinity_session: sessionToken,
        trinity_csrf: csrfToken,
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
