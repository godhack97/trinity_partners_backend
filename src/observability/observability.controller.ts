import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { Public } from "@decorators/Public";
import { HealthService } from "./health.service";
import { MetricsService } from "./metrics.service";

@Controller()
export class ObservabilityController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get("health/live")
  live() {
    return this.healthService.live();
  }

  @Public()
  @Get("health/ready")
  async ready(@Res({ passthrough: true }) response: Response) {
    const result = await this.healthService.ready();
    if (!result.ready) response.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }

  @Public()
  @Get("metrics")
  async metrics(
    @Headers("authorization") authorization: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const expected = String(this.configService.get("METRICS_TOKEN") || "");
    if (expected && authorization !== `Bearer ${expected}`) {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }
    response.type(this.metricsService.contentType());
    return this.metricsService.metrics();
  }
}

