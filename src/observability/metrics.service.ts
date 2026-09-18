import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { statfs } from "node:fs/promises";
import { resolve } from "node:path";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";
import { DataSource } from "typeorm";

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  private readonly httpDuration: Histogram<string>;
  private readonly httpRequests: Counter<string>;
  private readonly integrationRequests: Counter<string>;
  private readonly integrationStatus: Gauge<string>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.registry.setDefaultLabels({ service: "trinity-backend" });
    collectDefaultMetrics({ prefix: "trinity_", register: this.registry });

    this.httpDuration = new Histogram({
      name: "trinity_http_request_duration_seconds",
      help: "HTTP request latency in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
    this.httpRequests = new Counter({
      name: "trinity_http_requests_total",
      help: "HTTP requests by method, route and status",
      labelNames: ["method", "route", "status"],
      registers: [this.registry],
    });
    this.integrationRequests = new Counter({
      name: "trinity_integration_requests_total",
      help: "External integration calls by integration and result",
      labelNames: ["integration", "result"],
      registers: [this.registry],
    });
    this.integrationStatus = new Gauge({
      name: "trinity_integration_up",
      help: "Last known integration status (1 healthy, 0 failed)",
      labelNames: ["integration"],
      registers: [this.registry],
    });

    new Gauge({
      name: "trinity_db_pool_connections",
      help: "Database pool connections by state",
      labelNames: ["state"],
      registers: [this.registry],
      collect: () => this.collectDatabasePool(),
    });
    new Gauge({
      name: "trinity_disk_free_bytes",
      help: "Free bytes on the upload filesystem",
      registers: [this.registry],
      collect: async function () {
        const target = resolve(process.env.UPLOAD_DIR || "public");
        const info = await statfs(target);
        this.set(Number(info.bavail) * Number(info.bsize));
      },
    });
    new Gauge({
      name: "trinity_outbox_jobs",
      help: "Company notification outbox jobs by status",
      labelNames: ["status"],
      registers: [this.registry],
      collect: () => this.collectOutbox(),
    });
    new Gauge({
      name: "trinity_outbox_oldest_pending_age_seconds",
      help: "Age in seconds of the oldest pending or failed outbox job",
      registers: [this.registry],
      collect: () => this.collectOldestOutboxAge(),
    });
  }

  observeHttp(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const labels = {
      method,
      route,
      status: String(statusCode),
    };
    this.httpDuration.observe(labels, durationSeconds);
    this.httpRequests.inc(labels);
  }

  recordIntegration(integration: "bitrix" | "smtp", success: boolean) {
    this.integrationRequests.inc({
      integration,
      result: success ? "success" : "error",
    });
    this.integrationStatus.set({ integration }, success ? 1 : 0);
  }

  recordDatabase(success: boolean) {
    this.integrationStatus.set(
      { integration: "database" },
      success ? 1 : 0,
    );
  }

  contentType() {
    return this.registry.contentType;
  }

  metrics() {
    return this.registry.metrics();
  }

  private collectDatabasePool() {
    const metric = this.registry.getSingleMetric(
      "trinity_db_pool_connections",
    ) as Gauge<string>;
    const pool = (this.dataSource.driver as any)?.pool;
    metric.set({ state: "total" }, Number(pool?._allConnections?.length || 0));
    metric.set({ state: "idle" }, Number(pool?._freeConnections?.length || 0));
    metric.set(
      { state: "waiting" },
      Number(pool?._connectionQueue?.length || 0),
    );
    metric.set(
      { state: "limit" },
      Number(pool?.config?.connectionLimit || pool?.config?.connectionConfig?.connectionLimit || 10),
    );
  }

  private async collectOutbox() {
    const metric = this.registry.getSingleMetric(
      "trinity_outbox_jobs",
    ) as Gauge<string>;
    try {
      const rows = await this.dataSource.query(
        "SELECT status, COUNT(*) AS count FROM company_notification_outbox GROUP BY status",
      );
      for (const status of ["pending", "processing", "delivered", "failed"]) {
        const row = rows.find((item) => item.status === status);
        metric.set({ status }, Number(row?.count || 0));
      }
    } catch {
      metric.set({ status: "unavailable" }, 1);
    }
  }

  private async collectOldestOutboxAge() {
    const metric = this.registry.getSingleMetric(
      "trinity_outbox_oldest_pending_age_seconds",
    ) as Gauge<string>;
    try {
      const [row] = await this.dataSource.query(
        "SELECT TIMESTAMPDIFF(SECOND, MIN(created_at), CURRENT_TIMESTAMP) AS age FROM company_notification_outbox WHERE status IN ('pending', 'failed')",
      );
      metric.set(Math.max(0, Number(row?.age || 0)));
    } catch {
      metric.set(0);
    }
  }
}
