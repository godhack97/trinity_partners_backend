import { AddDealCreatorCompanySnapshot1780317700000 } from "../../migrations/1780317700000-AddDealCreatorCompanySnapshot";

const compactSql = (statement: string): string =>
  statement.replace(/\s+/gu, " ").trim();

describe("AddDealCreatorCompanySnapshot1780317700000", () => {
  it("adds the snapshot schema and backfills only unambiguous company links", async () => {
    const queryRunner = {
      hasColumn: jest.fn().mockResolvedValue(false),
      getTable: jest.fn().mockResolvedValue({ indices: [], foreignKeys: [] }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    await new AddDealCreatorCompanySnapshot1780317700000().up(
      queryRunner as any,
    );

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => compactSql(statement))
      .join("\n");

    expect(sql).toContain(
      "ALTER TABLE deals ADD COLUMN creator_company_id int unsigned NULL",
    );
    expect(sql).toContain(
      "CREATE INDEX IDX_deals_creator_company_id ON deals (creator_company_id)",
    );
    expect(sql).toContain(
      "CONSTRAINT FK_deals_creator_company FOREIGN KEY (creator_company_id) REFERENCES companies(id) ON DELETE RESTRICT",
    );
    expect(sql).toContain("owner_company.owner_id = owner_deal.creator_id");
    expect(sql).toContain(
      "membership.status IN ('accept', 'blocked', 'deleted')",
    );
    expect(sql).toContain("HAVING COUNT(DISTINCT candidate.company_id) = 1");
    expect(sql).toContain("WHERE deal.creator_company_id IS NULL");
  });

  it("does not recreate an existing column, index or foreign key", async () => {
    const queryRunner = {
      hasColumn: jest.fn().mockResolvedValue(true),
      getTable: jest.fn().mockResolvedValue({
        indices: [{ name: "IDX_deals_creator_company_id" }],
        foreignKeys: [{ name: "FK_deals_creator_company" }],
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    await new AddDealCreatorCompanySnapshot1780317700000().up(
      queryRunner as any,
    );

    const statements = queryRunner.query.mock.calls.map(([statement]) =>
      compactSql(statement),
    );
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("UPDATE deals deal INNER JOIN");
  });

  it("drops the foreign key and index before the snapshot column", async () => {
    const queryRunner = {
      hasColumn: jest.fn().mockResolvedValue(true),
      getTable: jest.fn().mockResolvedValue({
        indices: [{ name: "IDX_deals_creator_company_id" }],
        foreignKeys: [{ name: "FK_deals_creator_company" }],
      }),
      query: jest.fn().mockResolvedValue(undefined),
    };

    await new AddDealCreatorCompanySnapshot1780317700000().down(
      queryRunner as any,
    );

    expect(
      queryRunner.query.mock.calls.map(([statement]) => compactSql(statement)),
    ).toEqual([
      "ALTER TABLE deals DROP FOREIGN KEY FK_deals_creator_company",
      "DROP INDEX IDX_deals_creator_company_id ON deals",
      "ALTER TABLE deals DROP COLUMN creator_company_id",
    ]);
  });
});
