import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { NotificationService } from "@api/notification/notification.service";
import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  CompanyNotificationOutboxChannel,
  CompanyNotificationOutboxEntity,
  CompanyNotificationOutboxStatus,
  NotificationCategory,
  NotificationType,
} from "@orm/entities";
import { DataSource, EntityManager } from "typeorm";

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 50;

export type CompanyNotificationRecipient = {
  userId: number;
  email: string;
};

type EmailPayload = {
  subject: string;
  template: string;
  context: Record<string, unknown>;
};

type SitePayload = {
  title: string;
  text: string;
  actions?: { label: string; url: string }[];
};

export type CompanyNotificationEvent = {
  companyId: number;
  historyId: number;
  recipients: CompanyNotificationRecipient[];
  email?: EmailPayload;
  site?: SitePayload;
};

@Injectable()
export class CompanyNotificationOutboxService {
  private readonly logger = new Logger(CompanyNotificationOutboxService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly notificationService: NotificationService,
  ) {}

  async enqueue(
    entityManager: EntityManager,
    event: CompanyNotificationEvent,
  ): Promise<void> {
    const rows: Partial<CompanyNotificationOutboxEntity>[] = [];
    const emailAddresses = new Set<string>();

    for (const recipient of event.recipients) {
      if (event.site) {
        rows.push({
          company_id: event.companyId,
          user_id: recipient.userId,
          delivery_key: this.deliveryKey(event, recipient.userId, "site"),
          channel: CompanyNotificationOutboxChannel.Site,
          status: CompanyNotificationOutboxStatus.Pending,
          payload: event.site,
          attempts: 0,
          available_at: new Date(),
        });
      }

      const normalizedEmail = recipient.email?.trim().toLowerCase();
      if (event.email && normalizedEmail && !emailAddresses.has(normalizedEmail)) {
        emailAddresses.add(normalizedEmail);
        rows.push({
          company_id: event.companyId,
          user_id: recipient.userId,
          delivery_key: this.deliveryKey(event, recipient.userId, "email"),
          channel: CompanyNotificationOutboxChannel.Email,
          status: CompanyNotificationOutboxStatus.Pending,
          recipient_email: normalizedEmail,
          payload: event.email,
          attempts: 0,
          available_at: new Date(),
        });
      }
    }

    if (!rows.length) return;

    await entityManager
      .getRepository(CompanyNotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values(rows)
      .orIgnore()
      .execute();
  }

  async flushCompany(companyId: number): Promise<void> {
    try {
      await this.processPending(companyId);
    } catch (error) {
      this.logger.warn(
        `Не удалось немедленно обработать company outbox для company_id=${companyId}: ${this.errorCode(error)}`,
      );
    }
  }

  @Cron("*/1 * * * *")
  async retryScheduled(): Promise<void> {
    try {
      await this.recoverStuckJobs();
      await this.processPending();
    } catch (error) {
      this.logger.error(
        `Ошибка фоновой обработки company outbox: ${this.errorCode(error)}`,
      );
    }
  }

  async retryFailed(): Promise<number> {
    const result = await this.dataSource
      .getRepository(CompanyNotificationOutboxEntity)
      .createQueryBuilder()
      .update()
      .set({
        status: CompanyNotificationOutboxStatus.Pending,
        attempts: 0,
        available_at: new Date(),
        last_error: null,
      })
      .where("status = :status", {
        status: CompanyNotificationOutboxStatus.Failed,
      })
      .execute();

    return result.affected || 0;
  }

  async summary() {
    const repository = this.dataSource.getRepository(
      CompanyNotificationOutboxEntity,
    );
    const rows = await repository
      .createQueryBuilder("job")
      .select("job.status", "status")
      .addSelect("COUNT(job.id)", "count")
      .groupBy("job.status")
      .getRawMany();
    const oldest = await repository
      .createQueryBuilder("job")
      .select("MIN(job.created_at)", "oldest_pending_at")
      .where("job.status IN (:...statuses)", {
        statuses: [
          CompanyNotificationOutboxStatus.Pending,
          CompanyNotificationOutboxStatus.Failed,
        ],
      })
      .getRawOne();

    const counts = Object.values(CompanyNotificationOutboxStatus).reduce(
      (result, status) => ({ ...result, [status]: 0 }),
      {} as Record<CompanyNotificationOutboxStatus, number>,
    );
    rows.forEach((row) => {
      counts[row.status] = Number(row.count) || 0;
    });

    return {
      counts,
      oldest_pending_at: oldest?.oldest_pending_at || null,
    };
  }

  private async processPending(companyId?: number): Promise<void> {
    const repository = this.dataSource.getRepository(
      CompanyNotificationOutboxEntity,
    );
    const query = repository
      .createQueryBuilder("job")
      .where("job.status = :status", {
        status: CompanyNotificationOutboxStatus.Pending,
      })
      .andWhere("job.available_at <= CURRENT_TIMESTAMP")
      .orderBy("job.id", "ASC")
      .take(BATCH_SIZE);
    if (companyId) {
      query.andWhere("job.company_id = :companyId", { companyId });
    }

    const jobs = await query.getMany();
    for (const candidate of jobs) {
      const claim = await repository
        .createQueryBuilder()
        .update()
        .set({
          status: CompanyNotificationOutboxStatus.Processing,
          attempts: () => "attempts + 1",
          last_error: null,
        })
        .where("id = :id AND status = :status", {
          id: candidate.id,
          status: CompanyNotificationOutboxStatus.Pending,
        })
        .execute();
      if (claim.affected !== 1) continue;

      const job = await repository.findOneBy({ id: candidate.id });
      if (!job) continue;
      await this.deliver(job);
    }
  }

  private async deliver(job: CompanyNotificationOutboxEntity): Promise<void> {
    const repository = this.dataSource.getRepository(
      CompanyNotificationOutboxEntity,
    );
    try {
      if (job.channel === CompanyNotificationOutboxChannel.Email) {
        const payload = job.payload as EmailPayload;
        if (!job.recipient_email || !payload?.subject || !payload?.template) {
          throw new Error("INVALID_EMAIL_OUTBOX_PAYLOAD");
        }
        await this.emailConfirmerService.emailSendOrThrow({
          email: job.recipient_email,
          subject: payload.subject,
          template: payload.template,
          context: payload.context || {},
        });
      } else {
        const payload = job.payload as SitePayload;
        if (!job.user_id || !payload?.title || !payload?.text) {
          throw new Error("INVALID_SITE_OUTBOX_PAYLOAD");
        }
        await this.notificationService.sendWeb({
          user_id: job.user_id,
          title: payload.title,
          text: payload.text,
          category: NotificationCategory.Company,
          actions: payload.actions || null,
          type: NotificationType.Site,
          delivery_key: job.delivery_key,
        });
      }

      await repository.update(
        {
          id: job.id,
          status: CompanyNotificationOutboxStatus.Processing,
        },
        {
          status: CompanyNotificationOutboxStatus.Delivered,
          delivered_at: new Date(),
          last_error: null,
        },
      );
    } catch (error) {
      const failedPermanently = job.attempts >= MAX_ATTEMPTS;
      const delaySeconds = Math.min(3600, 30 * 2 ** Math.max(job.attempts - 1, 0));
      await repository.update(job.id, {
        status: failedPermanently
          ? CompanyNotificationOutboxStatus.Failed
          : CompanyNotificationOutboxStatus.Pending,
        available_at: new Date(Date.now() + delaySeconds * 1000),
        last_error: this.errorCode(error),
      });
      this.logger.warn(
        `Company notification delivery failed: job_id=${job.id}, attempt=${job.attempts}, code=${this.errorCode(error)}`,
      );
    }
  }

  private async recoverStuckJobs(): Promise<void> {
    await this.dataSource
      .getRepository(CompanyNotificationOutboxEntity)
      .createQueryBuilder()
      .update()
      .set({
        status: CompanyNotificationOutboxStatus.Pending,
        available_at: new Date(),
        last_error: "PROCESSING_TIMEOUT",
      })
      .where("status = :status", {
        status: CompanyNotificationOutboxStatus.Processing,
      })
      .andWhere("updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE)")
      .andWhere("attempts < :maxAttempts", { maxAttempts: MAX_ATTEMPTS })
      .execute();
  }

  private deliveryKey(
    event: CompanyNotificationEvent,
    userId: number,
    channel: "email" | "site",
  ) {
    return `company:${event.companyId}:history:${event.historyId}:user:${userId}:${channel}`;
  }

  private errorCode(error: unknown): string {
    const raw =
      (error as any)?.code ||
      (error as any)?.name ||
      (error as any)?.message ||
      "DELIVERY_ERROR";
    return String(raw)
      .replace(/[^a-zA-Z0-9_.:-]/g, "_")
      .slice(0, 128);
  }
}
