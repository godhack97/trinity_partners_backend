import { Module } from "@nestjs/common";
import { AdminConfiguratorServerGenerationService } from "./admin-configurator-server-generation.service";
import { AdminConfiguratorServerGenerationController } from "./admin-configurator-server-generation.controller";

@Module({
  controllers: [AdminConfiguratorServerGenerationController],
  providers: [AdminConfiguratorServerGenerationService],
})
export class AdminConfiguratorServerGenerationModule {}
