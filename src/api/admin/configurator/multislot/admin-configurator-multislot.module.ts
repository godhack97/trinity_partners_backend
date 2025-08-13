import { AdminConfiguratorMultislotService } from "./admin-configurator-multislot.service";
import { AdminConfiguratorMultislotController } from "./admin-configurator-multislot.controller";
import { Module } from "@nestjs/common";

@Module({
  controllers: [AdminConfiguratorMultislotController],
  providers: [AdminConfiguratorMultislotService],
  exports: [AdminConfiguratorMultislotService],
})
export class AdminConfiguratorMultislotModule {}
