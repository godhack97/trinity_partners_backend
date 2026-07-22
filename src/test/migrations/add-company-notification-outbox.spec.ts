import { AddCompanyNotificationOutbox1780316300000 } from "../../migrations/1780316300000-AddCompanyNotificationOutbox";

describe("AddCompanyNotificationOutbox1780316300000", () => {
  it("adds a durable queue and a web-notification idempotency key", async () => {
    const migration = new AddCompanyNotificationOutbox1780316300000();
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
      hasColumn: jest.fn().mockResolvedValue(false),
      hasTable: jest.fn().mockResolvedValue(false),
      getTable: jest.fn().mockResolvedValue({ indices: [] }),
    };

    await migration.up(queryRunner as any);

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join("\n");
    expect(sql).toContain("CREATE TABLE company_notification_outbox");
    expect(sql).toContain("UQ_company_notification_outbox_delivery_key");
    expect(sql).toContain("company_id int unsigned");
    expect(sql).toContain("IDX_company_notification_outbox_due");
    expect(sql).toContain("ADD COLUMN delivery_key");
    expect(sql).toContain("UQ_notifications_delivery_key");
  });
});
