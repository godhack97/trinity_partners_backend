import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/decorators/Public';
import { TransformResponse } from 'src/interceptors/transform-response.interceptor';
import { AuthService } from './auth.service';
import { AuthLoginRequestDto } from './dto/request/auth-login.request.dto';
import { ChangeForgotPasswordDto } from './dto/request/change-forgot-password.request.dto';
import { ForgotPasswordRequestDto } from './dto/request/forgot-password.request.dto';
import { UpdatePasswordRequestDto } from './dto/request/update-password.request.dto';
import { AuthLoginResponseDto } from './dto/response/auth-login.response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @UseInterceptors(new TransformResponse(AuthLoginResponseDto))
  @ApiResponse({ type: AuthLoginResponseDto })
  @ApiBody({ type: () => AuthLoginRequestDto })
  login(@Body() createAuthDto: AuthLoginRequestDto) {
    return this.authService.login(createAuthDto);
  }

  @Public()
  @Get('check')
  check(@Headers('authorization') authorization: string) {
    return this.authService.check(authorization);
  }

  @Post('logout')
  logout(@Headers('authorization') authorization: string) {
    return this.authService.logout(authorization)
  }

  @Post('update-password')
  @ApiBearerAuth()
  @ApiBody({ type: () => UpdatePasswordRequestDto })
  updatePassword(
    @Body() updatePassword: UpdatePasswordRequestDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.authService.updatePassword(authorization, updatePassword);
  }

  @Public()
  @Post('forgot-password')
  @ApiBody({ type: () => ForgotPasswordRequestDto })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordRequestDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('change-forgot-password')
  @ApiBody({ type: () => ChangeForgotPasswordDto })
  changeForgotPassword(@Body() changeForgot: ChangeForgotPasswordDto) {
    return this.authService.changeForgotPassword(changeForgot);
  }
}
