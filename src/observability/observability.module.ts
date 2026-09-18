import { Global, Module } from "@nestjs/common";
import { HealthService } from "./health.service";
import { MetricsService } from "./metrics.service";
import { ObservabilityController } from "./observability.controller";

@Global()
@Module({
  controllers: [ObservabilityController],
  providers: [HealthService, MetricsService],
  exports: [HealthService, MetricsService],
})
export class ObservabilityModule {}

