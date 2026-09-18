import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { statfs } from "node:fs/promises";
import { resolve } from "node:path";
import { DataSource } from "typeorm";
import { MetricsService } from "./metrics.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  live() {
    return {
      status: "ok",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async ready() {
    const checks: Record<string, unknown> = {};
    let ready = true;

    try {
      await this.dataSource.query("SELECT 1");
      this.metricsService.recordDatabase(true);
      checks.database = { status: "up" };
    } catch (error) {
      this.metricsService.recordDatabase(false);
      ready = false;
      checks.database = { status: "down", code: this.errorCode(error) };
    }

    try {
      const target = resolve(this.configService.get("UPLOAD_DIR") || "public");
      const info = await statfs(target);
      const freeBytes = Number(info.bavail) * Number(info.bsize);
      const minimum = Number(
        this.configService.get("READY_DISK_MIN_FREE_BYTES") || 1024 ** 3,
      );
      if (freeBytes < minimum) ready = false;
      checks.disk = {
        status: freeBytes >= minimum ? "up" : "low",
        freeBytes,
        minimumFreeBytes: minimum,
      };
    } catch (error) {
      ready = false;
      checks.disk = { status: "down", code: this.errorCode(error) };
    }

    return { ready, status: ready ? "ok" : "error", checks };
  }

  private errorCode(error: unknown) {
    return typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code || "unknown")
      : "unknown";
  }
}
