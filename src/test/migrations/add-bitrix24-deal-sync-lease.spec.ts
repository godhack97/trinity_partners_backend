import { AddBitrix24DealSyncLease1780317600000 } from "../../migrations/1780317600000-AddBitrix24DealSyncLease";

const normalizedSql = (calls: any[][]) =>
  calls.map(([sql]) => String(sql).replace(/\s+/g, " ").trim());

describe("AddBitrix24DealSyncLease1780317600000", () => {
  it("adds processing status, fenced lease columns and candidate index", async () => {
    const queryRunner = {
      hasColumn: jest.fn(async (_table: string, column: string) =>
        ["bitrix24_sync_status"].includes(column),
      ),
      getTable: jest.fn().mockResolvedValue({ indices: [] }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    await new AddBitrix24DealSyncLease1780317600000().up(queryRunner as any);

    const sql = normalizedSql(queryRunner.query.mock.calls).join("\n");
    expect(sql).toContain(
      "enum('pending','processing','synced','failed') NULL DEFAULT 'pending'",
    );
    expect(sql).toContain(
      "ADD COLUMN bitrix24_sync_started_at datetime(6) NULL",
    );
    expect(sql).toContain("ADD COLUMN bitrix24_sync_token varchar(36) NULL");
    expect(sql).toContain(
      "CREATE INDEX IDX_deals_bitrix24_sync_lease ON deals (bitrix24_sync_status, bitrix24_sync_started_at)",
    );
  });

  it("fails active leases back before restoring the legacy enum", async () => {
    const queryRunner = {
      hasColumn: jest.fn().mockResolvedValue(true),
      getTable: jest.fn().mockResolvedValue({
        indices: [{ name: "IDX_deals_bitrix24_sync_lease" }],
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    await new AddBitrix24DealSyncLease1780317600000().down(queryRunner as any);

    const sql = normalizedSql(queryRunner.query.mock.calls);
    expect(sql[0]).toContain(
      "SET bitrix24_sync_status = 'failed' WHERE bitrix24_sync_status = 'processing'",
    );
    expect(sql).toContain("DROP INDEX IDX_deals_bitrix24_sync_lease ON deals");
    expect(sql.join("\n")).toContain("enum('pending','synced','failed')");
  });
});
