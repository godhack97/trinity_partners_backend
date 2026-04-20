import { Module } from "@nestjs/common";
import { ImportantAlertController } from "./important-alert.controller";
import { ImportantAlertService } from "./important-alert.service";

@Module({
  controllers: [ImportantAlertController],
  providers: [ImportantAlertService],
  exports: [ImportantAlertService],
})
export class ImportantAlertModule {}
