import { Module } from "@nestjs/common";
import { AdminImportantAlertController } from "./admin-important-alert.controller";
import { AdminImportantAlertService } from "./admin-important-alert.service";

@Module({
  controllers: [AdminImportantAlertController],
  providers: [AdminImportantAlertService],
  exports: [AdminImportantAlertService],
})
export class AdminImportantAlertModule {}
