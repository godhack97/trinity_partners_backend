import { Module } from "@nestjs/common";
import { AdminConfiguratorServerController } from "./admin-configurator-server.controller";
import { AdminConfiguratorServerService } from "./admin-configurator-server.service";

@Module({
  controllers: [AdminConfiguratorServerController],
  providers: [AdminConfiguratorServerService],
  exports: [AdminConfiguratorServerService]
})
export class AdminConfiguratorServerModule {}