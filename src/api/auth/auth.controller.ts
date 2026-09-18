import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Param,
  Res,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthLoginRequestDto } from "./dto/request/auth-login.request.dto";
import { AuthCheckResponseDto } from "./dto/response/auth-check.response.dto";
import { Request, Response } from "express";
import { Public } from "src/decorators/Public";
import { AllowRestrictedCompanyAccess } from "@decorators/AllowRestrictedCompanyAccess";
import { LogAction } from "src/logs/log-action.decorator";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import {
  createCsrfToken,
  csrfCookieName,
  sessionCookieName,
} from "@app/security/request-session";
import { normalizeSessionClientId } from "@app/utils/session-token";
import { Throttle } from "@nestjs/throttler";

@Controller("auth")
@ApiTags("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private extractClientId(query: any, body: any, headers: any): string {
    return (
      query.client_id ||
      body.client_id ||
      headers["client-id"] ||
      headers["Client-Id"] ||
      headers["origin"]
    );
  }

  @Post("login")
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Вход в систему" })
  @ApiBody({ type: AuthLoginRequestDto })
  @ApiResponse({ status: 201, description: "Успешный вход" })
  async login(
    @Body() dto: AuthLoginRequestDto,
    @Query() query,
    @Headers() headers,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const clientId = this.extractClientId(query, dto, headers);
    const result = await this.authService.login(dto, clientId, req);
    if (normalizeSessionClientId(clientId) !== "web:portal") return result;

    this.setPortalCookies(response, result.token);
    return { user: result.user };
  }

  @Post("logout")
  @AllowRestrictedCompanyAccess()
  @ApiOperation({ summary: "Выход из системы" })
  @ApiResponse({ status: 201, description: "Успешный выход" })
  async logout(
    @Headers() headers,
    @Query() query,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authorization = headers.authorization;
    const clientId = this.extractClientId(query, {}, headers);
    await this.authService.logout(authorization, clientId);
    this.clearPortalCookies(response);
    return { success: true };
  }

  @Get("check")
  @AllowRestrictedCompanyAccess()
  @ApiOperation({ summary: "Проверка токена" })
  @ApiResponse({ status: 200, type: AuthCheckResponseDto })
  async check(@Headers() headers, @Query() query, @Req() req: Request) {
    const authorization = headers.authorization;
    const clientId = this.extractClientId(query, {}, headers);
    return this.authService.check(authorization, clientId, req);
  }

  @Post("update-password")
  @ApiOperation({ summary: "Обновление пароля" })
  @ApiResponse({ status: 201, description: "Пароль обновлен" })
  @LogAction("auth_update_password", "users")
  async updatePassword(
    @Body() body,
    @Headers() headers,
    @Query() query,
    @Req() req: Request,
  ) {
    const authorization = headers.authorization;
    const clientId = this.extractClientId(query, body, headers);
    return this.authService.updatePassword(authorization, clientId, body);
  }

  @Post("forgot-password")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Забыл пароль" })
  @ApiResponse({ status: 201, description: "Письмо отправлено" })
  async forgotPassword(@Body() body) {
    return this.authService.forgotPassword(body);
  }

  @Post("change-forgot-password")
  @LogAction("auth_recovery_password", "users")
  @Public()
  @ApiOperation({ summary: "Восстановление пароля" })
  @ApiResponse({ status: 201, description: "Пароль восстановлен" })
  async recoveryPassword(@Body() body) {
    return this.authService.recoveryPassword(body);
  }

  @Get("user-activity/:userId")
  @ApiParam({ name: "userId", type: "number" })
  @ApiOperation({ summary: "Активность пользователя" })
  @ApiResponse({ status: 200, description: "История активности" })
  async getUserActivity(@Param("userId") userId: number) {
    return this.authService.getUserActivity(userId);
  }

  private setPortalCookies(response: Response, token: string) {
    const secure = this.cookieSecure();
    const maxAge =
      Number(this.configService.get("AUTH_SESSION_TTL_DAYS")) *
      24 *
      60 *
      60 *
      1000;
    response.cookie(sessionCookieName(), token, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge,
    });
    response.cookie(csrfCookieName(), createCsrfToken(token), {
      httpOnly: false,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge,
      ...(this.csrfCookieDomain()
        ? { domain: this.csrfCookieDomain() }
        : {}),
    });
  }

  private clearPortalCookies(response: Response) {
    const options = {
      httpOnly: true,
      secure: this.cookieSecure(),
      sameSite: "strict" as const,
      path: "/",
    };
    response.clearCookie(sessionCookieName(), options);
    response.clearCookie(csrfCookieName(), {
      ...options,
      httpOnly: false,
      ...(this.csrfCookieDomain()
        ? { domain: this.csrfCookieDomain() }
        : {}),
    });
  }

  private cookieSecure() {
    return String(this.configService.get("COOKIE_SECURE")) === "true" ||
      this.configService.get("COOKIE_SECURE") === true;
  }

  private csrfCookieDomain() {
    return String(this.configService.get("CSRF_COOKIE_DOMAIN") || "").trim();
  }
}
