import { AddPermanentCompanyDeletion1780321300000 } from
  "../../migrations/1780321300000-AddPermanentCompanyDeletion";

describe("AddPermanentCompanyDeletion1780321300000", () => {
  it("creates historical identities and repoints company references", async () => {
    const queryRunner = {
      hasTable: jest.fn(async (table: string) => table !== "company_identities"),
      createTable: jest.fn().mockResolvedValue(undefined),
      getTable: jest.fn().mockResolvedValue({
        foreignKeys: [],
        findColumnByName: jest.fn().mockReturnValue({ name: "company_id" }),
      }),
      dropForeignKey: jest.fn().mockResolvedValue(undefined),
      createForeignKey: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    };

    await new AddPermanentCompanyDeletion1780321300000().up(queryRunner as any);

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join("\n");
    const foreignKeys = queryRunner.createForeignKey.mock.calls.map(
      ([, foreignKey]) => foreignKey,
    );

    expect(queryRunner.createTable).toHaveBeenCalledWith(
      expect.objectContaining({ name: "company_identities" }),
    );
    expect(sql).toContain("INSERT INTO company_identities");
    expect(sql).toContain("Историческая компания #");
    expect(sql).toContain("'legacy_orphan', TRUE");
    expect(sql).toContain("CREATE TRIGGER trg_companies_identity_after_insert");
    expect(sql).toContain("CREATE TRIGGER trg_companies_identity_after_update");
    expect(foreignKeys).toHaveLength(7);
    expect(foreignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "FK_deals_creator_company_identity",
          referencedTableName: "company_identities",
        }),
        expect.objectContaining({
          name: "FK_company_history_company_identity",
          referencedTableName: "company_identities",
        }),
      ]),
    );
  });
});
