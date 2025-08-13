// src/integrations/bitrix24/bitrix24.module.ts
import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { LogsModule } from "../../logs/logs.module";
import { Bitrix24Service } from "./bitrix24.service";
import { Bitrix24QueueService } from "./bitrix24-queue.service";
import { Bitrix24AdminController } from "./bitrix24-admin.controller";

@Module({
  imports: [
    LogsModule,
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 5,
    }),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [Bitrix24AdminController],
  providers: [Bitrix24Service, Bitrix24QueueService],
  exports: [Bitrix24Service, Bitrix24QueueService],
})
export class Bitrix24Module {}
