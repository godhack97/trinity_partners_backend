import { Module } from "@nestjs/common";
import { RecommendedConfigsController } from "./recommended-configs.controller";
import { RecommendedConfigsService } from "./recommended-configs.service";

@Module({
  controllers: [RecommendedConfigsController],
  providers: [RecommendedConfigsService],
  exports: [RecommendedConfigsService],
})
export class RecommendedConfigsModule {}
