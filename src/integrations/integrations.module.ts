import { Module } from "@nestjs/common";
import { Bitrix24Module } from "./bitrix24/bitrix24.module";

@Module({
  imports: [Bitrix24Module],
  exports: [Bitrix24Module],
})
export class IntegrationsModule {}
