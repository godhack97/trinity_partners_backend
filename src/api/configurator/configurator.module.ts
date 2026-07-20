import { Module } from "@nestjs/common";
import { ConfiguratorService } from "./configurator.service";
import { ConfiguratorController } from "./configurator.controller";

@Module({
  controllers: [ConfiguratorController],
  providers: [ConfiguratorService],
  exports: [ConfiguratorService],
})
export class ConfiguratorModule {}
