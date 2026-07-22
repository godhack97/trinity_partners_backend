import {
  CompanyNotificationOutboxChannel,
  CompanyNotificationOutboxStatus,
  NotificationType,
} from "@orm/entities";
import { CompanyNotificationOutboxService } from "./company-notification-outbox.service";

describe("CompanyNotificationOutboxService", () => {
  const createInsertManager = () => {
    const queryBuilder: any = {};
    queryBuilder.insert = jest.fn(() => queryBuilder);
    queryBuilder.values = jest.fn(() => queryBuilder);
    queryBuilder.orIgnore = jest.fn(() => queryBuilder);
    queryBuilder.execute = jest.fn().mockResolvedValue({});
    const entityManager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => queryBuilder),
      })),
    };
    return { entityManager, queryBuilder };
  };

  it("queues site notifications per user and deduplicates email addresses", async () => {
    const { entityManager, queryBuilder } = createInsertManager();
    const service = new CompanyNotificationOutboxService(
      {} as any,
      {} as any,
      {} as any,
    );

    await service.enqueue(entityManager as any, {
      companyId: 15,
      historyId: 27,
      recipients: [
        { userId: 1, email: "Admin@Example.com" },
        { userId: 2, email: "admin@example.com" },
      ],
      email: {
        subject: "Ограничение",
        template: "company-access-limited",
        context: { reason: "Причина" },
      },
      site: { title: "Ограничение", text: "Причина" },
    });

    const rows = queryBuilder.values.mock.calls[0][0];
    expect(rows).toHaveLength(3);
    expect(
      rows.filter((row) => row.channel === CompanyNotificationOutboxChannel.Site),
    ).toHaveLength(2);
    expect(
      rows.filter((row) => row.channel === CompanyNotificationOutboxChannel.Email),
    ).toHaveLength(1);
    expect(rows.map((row) => row.delivery_key)).toEqual([
      "company:15:history:27:user:1:site",
      "company:15:history:27:user:1:email",
      "company:15:history:27:user:2:site",
    ]);
    expect(queryBuilder.orIgnore).toHaveBeenCalledTimes(1);
  });

  it("marks a delivered email and never stores full SMTP error text", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const dataSource = { getRepository: jest.fn(() => ({ update })) };
    const email = { emailSendOrThrow: jest.fn().mockResolvedValue({}) };
    const service = new CompanyNotificationOutboxService(
      dataSource as any,
      email as any,
      {} as any,
    );
    const job = {
      id: 5,
      channel: CompanyNotificationOutboxChannel.Email,
      status: CompanyNotificationOutboxStatus.Processing,
      attempts: 1,
      recipient_email: "admin@example.com",
      payload: {
        subject: "Тема",
        template: "company-access-limited",
        context: { reason: "Причина" },
      },
    };

    await (service as any).deliver(job);

    expect(email.emailSendOrThrow).toHaveBeenCalledWith({
      email: "admin@example.com",
      subject: "Тема",
      template: "company-access-limited",
      context: { reason: "Причина" },
    });
    expect(update).toHaveBeenCalledWith(
      { id: 5, status: CompanyNotificationOutboxStatus.Processing },
      expect.objectContaining({
        status: CompanyNotificationOutboxStatus.Delivered,
        last_error: null,
      }),
    );
  });

  it("retries a temporary delivery error with bounded metadata", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const dataSource = { getRepository: jest.fn(() => ({ update })) };
    const email = {
      emailSendOrThrow: jest.fn().mockRejectedValue({
        code: "ETIMEDOUT",
        message: "smtp://user:secret@example.com full sensitive error",
      }),
    };
    const service = new CompanyNotificationOutboxService(
      dataSource as any,
      email as any,
      {} as any,
    );

    await (service as any).deliver({
      id: 6,
      channel: CompanyNotificationOutboxChannel.Email,
      status: CompanyNotificationOutboxStatus.Processing,
      attempts: 2,
      recipient_email: "admin@example.com",
      payload: {
        subject: "Тема",
        template: "company-access-limited",
        context: {},
      },
    });

    expect(update).toHaveBeenCalledWith(
      6,
      expect.objectContaining({
        status: CompanyNotificationOutboxStatus.Pending,
        last_error: "ETIMEDOUT",
      }),
    );
    expect(JSON.stringify(update.mock.calls)).not.toContain("secret");
  });

  it("uses the outbox delivery key to deduplicate site notifications", async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const notification = { sendWeb: jest.fn().mockResolvedValue({ id: 8 }) };
    const service = new CompanyNotificationOutboxService(
      { getRepository: jest.fn(() => ({ update })) } as any,
      {} as any,
      notification as any,
    );

    await (service as any).deliver({
      id: 7,
      user_id: 3,
      delivery_key: "company:1:history:2:user:3:site",
      channel: CompanyNotificationOutboxChannel.Site,
      status: CompanyNotificationOutboxStatus.Processing,
      attempts: 1,
      payload: { title: "Статус", text: "Доступ восстановлен" },
    });

    expect(notification.sendWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 3,
        type: NotificationType.Site,
        delivery_key: "company:1:history:2:user:3:site",
      }),
    );
  });
});
