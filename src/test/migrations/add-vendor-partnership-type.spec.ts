import { QueryRunner } from "typeorm";
import { AddVendorPartnershipType1780317900000 } from "../../migrations/1780317900000-AddVendorPartnershipType";

describe("AddVendorPartnershipType1780317900000", () => {
  it("adds vendor to the companies partnership enum", async () => {
    const statements: string[] = [];
    const runner = {
      query: jest.fn(async (sql: string) =>
        statements.push(sql.replace(/\s+/gu, " ").trim()),
      ),
    } as unknown as QueryRunner;

    await new AddVendorPartnershipType1780317900000().up(runner);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain(
      "enum('integrator', 'distributor', 'vendor')",
    );
  });

  it("converts vendor companies before restoring the previous enum", async () => {
    const statements: string[] = [];
    const runner = {
      query: jest.fn(async (sql: string) =>
        statements.push(sql.replace(/\s+/gu, " ").trim()),
      ),
    } as unknown as QueryRunner;

    await new AddVendorPartnershipType1780317900000().down(runner);

    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("SET partnership_type = 'integrator'");
    expect(statements[1]).toContain("enum('integrator', 'distributor')");
  });
});
