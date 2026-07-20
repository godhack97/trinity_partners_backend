import { Module } from "@nestjs/common";
import { RecommendedConfigsController } from "./recommended-configs.controller";
import { RecommendedConfigsService } from "./recommended-configs.service";
import { ConfiguratorModule } from "@api/configurator/configurator.module";

@Module({
  imports: [ConfiguratorModule],
  controllers: [RecommendedConfigsController],
  providers: [RecommendedConfigsService],
  exports: [RecommendedConfigsService],
})
export class RecommendedConfigsModule {}
