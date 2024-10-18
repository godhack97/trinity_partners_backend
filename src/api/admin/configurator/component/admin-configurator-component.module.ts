import { Module } from "@nestjs/common";
import { AdminConfiguratorComponentController } from "./admin-configurator-component.controller";
import { AdminConfiguratorComponentService } from "./admin-configurator-component.service";

@Module({
  controllers: [AdminConfiguratorComponentController],
  providers: [AdminConfiguratorComponentService],
  exports: [AdminConfiguratorComponentService]
})
export class AdminConfiguratorComponentModule {}