import { Module } from "@nestjs/common";
import { ConfiguratorDraftsService } from "./configurator-drafts.service";
import { ConfiguratorDraftsController } from "./configurator-drafts.controller";

@Module({
  controllers: [ConfiguratorDraftsController],
  providers: [ConfiguratorDraftsService],
  exports: [ConfiguratorDraftsService],
})
export class ConfiguratorDraftsModule {}
