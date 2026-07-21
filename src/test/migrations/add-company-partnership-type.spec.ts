import { AddCompanyPartnershipType1776176200000 } from "../../../migrations/1776176200000-AddCompanyPartnershipType";

describe("AddCompanyPartnershipType1776176200000", () => {
  const createQueryRunner = (hasColumn: boolean) => ({
    hasColumn: jest.fn().mockResolvedValue(hasColumn),
    query: jest.fn().mockResolvedValue(undefined),
  });

  it("adds partnership_type when the column is absent", async () => {
    const queryRunner = createQueryRunner(false);

    await new AddCompanyPartnershipType1776176200000().up(queryRunner as any);

    expect(queryRunner.hasColumn).toHaveBeenCalledWith(
      "companies",
      "partnership_type",
    );
    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining("ADD COLUMN partnership_type"),
    );
  });

  it("accepts a column created by the newer compatibility migration", async () => {
    const queryRunner = createQueryRunner(true);

    await new AddCompanyPartnershipType1776176200000().up(queryRunner as any);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });

  it("drops partnership_type only when the column exists", async () => {
    const existingColumn = createQueryRunner(true);
    const absentColumn = createQueryRunner(false);
    const migration = new AddCompanyPartnershipType1776176200000();

    await migration.down(existingColumn as any);
    await migration.down(absentColumn as any);

    expect(existingColumn.query).toHaveBeenCalledWith(
      expect.stringContaining("DROP COLUMN partnership_type"),
    );
    expect(absentColumn.query).not.toHaveBeenCalled();
  });
});
