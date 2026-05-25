import { Module } from "@nestjs/common";
import { ConfiguratorDraftsService } from "./configurator-drafts.service";
import { ConfiguratorDraftsController } from "./configurator-drafts.controller";
import { NotificationModule } from "@api/notification/notification.module";

@Module({
  imports: [NotificationModule],
  controllers: [ConfiguratorDraftsController],
  providers: [ConfiguratorDraftsService],
  exports: [ConfiguratorDraftsService],
})
export class ConfiguratorDraftsModule {}
