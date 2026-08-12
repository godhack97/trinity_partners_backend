import { QueryRunner } from "typeorm";
import { AddDistributorCompanyImportPlans1780317800000 } from "../../migrations/1780317800000-AddDistributorCompanyImportPlans";

describe("AddDistributorCompanyImportPlans1780317800000", () => {
  it("creates a credential-free, idempotent staging table", async () => {
    const statements: string[] = [];
    const runner = {
      hasTable: jest.fn().mockResolvedValue(false),
      query: jest.fn(async (sql: string) => statements.push(sql.replace(/\s+/gu, " ").trim())),
    } as unknown as QueryRunner;

    await new AddDistributorCompanyImportPlans1780317800000().up(runner);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("CREATE TABLE distributor_company_import_plans");
    expect(statements[0]).toContain("UNIQUE KEY UQ_distributor_company_import_legacy");
    expect(statements[0]).toContain("mapping_fingerprint char(64) NOT NULL");
    expect(statements[0]).not.toContain("password");
    expect(statements[0]).not.toContain("salt");
  });

  it("does nothing when the staging table already exists", async () => {
    const runner = {
      hasTable: jest.fn().mockResolvedValue(true),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await new AddDistributorCompanyImportPlans1780317800000().up(runner);
    expect(runner.query).not.toHaveBeenCalled();
  });

  it("drops only its staging table on rollback", async () => {
    const runner = {
      hasTable: jest.fn().mockResolvedValue(true),
      query: jest.fn(),
    } as unknown as QueryRunner;

    await new AddDistributorCompanyImportPlans1780317800000().down(runner);
    expect(runner.query).toHaveBeenCalledWith(
      "DROP TABLE distributor_company_import_plans",
    );
  });
});
