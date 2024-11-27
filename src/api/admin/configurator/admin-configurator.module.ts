import { Module } from "@nestjs/common";
import { AdminConfiguratorService } from "./admin-configurator.service";
import { AdminConfiguratorController } from "./admin-configurator.controller";
import { AdminConfiguratorMultislotModule } from "./multislot/admin-configurator-multislot.module";
import { AdminConfiguratorComponentModule } from "./component/admin-configurator-component.module";
import { AdminConfiguratorSlotModule } from "./slot/admin-configurator-slot.module";
import { AdminConfiguratorServerHeightModule } from "./server-height/admin-configurator-server-height.module";
import { AdminConfiguratorServerModule } from "./server/admin-configurator-server.module";
import { AdminConfiguratorServerGenerationModule } from './server-generation/admin-configurator-server-generation/admin-configurator-server-generation.module';

@Module({
  imports: [
    AdminConfiguratorMultislotModule,
    AdminConfiguratorComponentModule,
    AdminConfiguratorSlotModule,
    AdminConfiguratorServerModule,
    AdminConfiguratorServerHeightModule,
    AdminConfiguratorServerGenerationModule
  ],
  controllers: [AdminConfiguratorController],
  providers: [AdminConfiguratorService],
  exports: [AdminConfiguratorService],
})
export class AdminConfiguratorModule {}