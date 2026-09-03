import { AddDealFinalSum1780320700000 } from "../../migrations/1780320700000-AddDealFinalSum";

describe("AddDealFinalSum1780320700000", () => {
  it("adds a nullable decimal final sum column", async () => {
    const queryRunner = {
      hasColumn: jest.fn().mockResolvedValue(false),
      addColumn: jest.fn().mockResolvedValue(undefined),
    };

    await new AddDealFinalSum1780320700000().up(queryRunner as any);

    expect(queryRunner.addColumn).toHaveBeenCalledWith(
      "deals",
      expect.objectContaining({
        name: "final_deal_sum",
        type: "decimal",
        precision: 15,
        scale: 2,
        isNullable: true,
      }),
    );
  });

  it("is idempotent when the column already exists", async () => {
    const queryRunner = {
      hasColumn: jest.fn().mockResolvedValue(true),
      addColumn: jest.fn(),
    };

    await new AddDealFinalSum1780320700000().up(queryRunner as any);

    expect(queryRunner.addColumn).not.toHaveBeenCalled();
  });
});
