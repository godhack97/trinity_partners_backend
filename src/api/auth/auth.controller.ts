import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Param,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthLoginRequestDto } from "./dto/request/auth-login.request.dto";
import { AuthCheckResponseDto } from "./dto/response/auth-check.response.dto";
import { Request } from "express";
import { Public } from "src/decorators/Public";
import { LogAction } from "src/logs/log-action.decorator";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  private extractClientId(query: any, body: any, headers: any): string {
    return (
      headers["origin"] ||
      query.client_id ||
      body.client_id ||
      headers["client-id"] ||
      headers["Client-Id"]
    );
  }

  @Post("login")
  @Public()
  @ApiOperation({ summary: "Вход в систему" })
  @ApiBody({ type: AuthLoginRequestDto })
  @ApiResponse({ status: 201, description: "Успешный вход" })
  async login(
    @Body() dto: AuthLoginRequestDto,
    @Query() query,
    @Headers() headers,
    @Req() req: Request,
  ) {
    const clientId = this.extractClientId(query, dto, headers);
    return this.authService.login(dto, clientId, req);
  }

  @Post("logout")
  @ApiOperation({ summary: "Выход из системы" })
  @ApiResponse({ status: 201, description: "Успешный выход" })
  async logout(@Headers() headers, @Query() query, @Req() req: Request) {
    const authorization = headers.authorization;
    const clientId = this.extractClientId(query, {}, headers);
    return this.authService.logout(authorization, clientId);
  }

  @Get("check")
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
}
