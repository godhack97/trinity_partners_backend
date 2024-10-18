import { Module } from "@nestjs/common";
import { AdminConfiguratorServerHeightController } from "./admin-configurator-server-height.controller";
import { AdminConfiguratorServerHeightService } from "./admin-configurator-server-height.service";

@Module({
  controllers: [AdminConfiguratorServerHeightController],
  providers: [AdminConfiguratorServerHeightService],
  exports: [AdminConfiguratorServerHeightService],
})
export class AdminConfiguratorServerHeightModule {}