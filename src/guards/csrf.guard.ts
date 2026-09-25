import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "@decorators/Public";
import type { Request } from "express";
import {
  csrfCookieName,
  csrfTokenMatchesSession,
  extractRequestSession,
} from "@app/security/request-session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const session = extractRequestSession(request);
    const authenticatedSource = (request as Request & {
      auth_session_source?: "bearer" | "cookie";
      auth_session_token?: string;
    }).auth_session_source;
    const source = authenticatedSource || session?.source;
    const sessionToken = (request as Request & {
      auth_session_token?: string;
    }).auth_session_token || session?.token;
    if (source !== "cookie" || !sessionToken) return true;

    const submittedToken = String(request.headers["x-csrf-token"] || "");
    const cookieToken = String(request.cookies?.[csrfCookieName()] || "");
    if (
      !csrfTokenMatchesSession(sessionToken, submittedToken, cookieToken)
    ) {
      throw new ForbiddenException("CSRF-токен отсутствует или недействителен");
    }

    return true;
  }
}
