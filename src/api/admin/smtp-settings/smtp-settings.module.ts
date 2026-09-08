import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SmtpSettingEntity } from "@orm/entities";
import { SmtpSettingsController } from "./smtp-settings.controller";
import { SmtpSettingsService } from "./smtp-settings.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SmtpSettingEntity])],
  controllers: [SmtpSettingsController],
  providers: [SmtpSettingsService],
  exports: [SmtpSettingsService],
})
export class SmtpSettingsModule {}
