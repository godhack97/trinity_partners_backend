import { Body, Controller, Get, Put, Post, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LogAction } from "src/logs/log-action.decorator";
import { SmtpSettingsDto } from "./dto/smtp-settings.dto";
import { SmtpSettingsService } from "./smtp-settings.service";

@ApiTags("smtp-settings")
@ApiBearerAuth()
@Controller("admin/smtp-settings")
export class SmtpSettingsController {
  constructor(private readonly smtpSettingsService: SmtpSettingsService) {}

  @Get()
  @ApiOperation({ summary: "Получить настройки SMTP без пароля" })
  getSettings() {
    return this.smtpSettingsService.getPublicSettings();
  }

  @Post("verify")
  @ApiOperation({ summary: "Проверить подключение к SMTP" })
  verify(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    data: SmtpSettingsDto,
  ) {
    return this.smtpSettingsService.verify(data);
  }

  @Put()
  @LogAction("smtp_settings_update", "smtp_settings")
  @ApiOperation({ summary: "Проверить и сохранить настройки SMTP" })
  save(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    data: SmtpSettingsDto,
  ) {
    return this.smtpSettingsService.save(data);
  }
}
