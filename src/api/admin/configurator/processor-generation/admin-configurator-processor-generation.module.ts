import { Module } from "@nestjs/common";
import { AdminConfiguratorProcessorGenerationService } from "./admin-configurator-processor-generation.service";
import { AdminConfiguratorProcessorGenerationController } from "./admin-configurator-processor-generation.controller";

@Module({
  controllers: [AdminConfiguratorProcessorGenerationController],
  providers: [AdminConfiguratorProcessorGenerationService],
})
export class AdminConfiguratorProcessorGenerationModule {}
