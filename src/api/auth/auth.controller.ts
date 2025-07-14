import { Body, Controller, Get, Headers, Post, Query, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLoginRequestDto } from './dto/request/auth-login.request.dto';
import { Request } from 'express';
import { Public } from 'src/decorators/Public';
import { LogAction } from 'src/logs/log-action.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractClientId(query: any, body: any, headers: any): string {
    // Если client_id не передан в query, body, или headers, берем origin из заголовков
    return (
      headers['origin'] ||
      query.client_id ||
      body.client_id ||
      headers['client-id'] ||
      headers['Client-Id']
    );
  }

  @Post('login')
  @Public()
  async login(@Body() dto: AuthLoginRequestDto, @Query() query, @Headers() headers) {
    const clientId = this.extractClientId(query, dto, headers);
    return this.authService.login(dto, clientId);
  }

  @Post('logout')
  async logout(@Headers() headers, @Query() query, @Req() req: Request) {
    const authorization = headers.authorization;
    const clientId = this.extractClientId(query, {}, headers);
    return this.authService.logout(authorization, clientId);
  }

  @Get('check')
  async check(@Headers() headers, @Query() query) {
    const authorization = headers.authorization;
    const clientId = this.extractClientId(query, {}, headers);
    return this.authService.check(authorization, clientId);
  }

  @Post('update-password')
  @LogAction('auth_update_password', 'users')
  async updatePassword(@Body() body, @Headers() headers, @Query() query, @Req() req: Request) {
    const authorization = headers.authorization;
    const clientId = this.extractClientId(query, body, headers);
    return this.authService.updatePassword(authorization, clientId, body);
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() body) {
    return this.authService.forgotPassword(body);
  }

  @Post('change-forgot-password')
  @LogAction('auth_recovery_password', 'users')
  @Public()
  async recoveryPassword(@Body() body) {
    return this.authService.recoveryPassword(body);
  }
}
