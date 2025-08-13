import { Module } from "@nestjs/common";
import { AdminConfiguratorSlotController } from "./admin-configurator-slot.controller";
import { AdminConfiguratorSlotService } from "./admin-configurator-slot.service";

@Module({
  controllers: [AdminConfiguratorSlotController],
  providers: [AdminConfiguratorSlotService],
  exports: [AdminConfiguratorSlotService],
})
export class AdminConfiguratorSlotModule {}
