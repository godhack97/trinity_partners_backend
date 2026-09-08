import { Module } from "@nestjs/common";
import { BugReportController } from "./bug-report.controller";
import { BugReportService } from "./bug-report.service";

@Module({
  controllers: [BugReportController],
  providers: [BugReportService],
})
export class BugReportModule {}
