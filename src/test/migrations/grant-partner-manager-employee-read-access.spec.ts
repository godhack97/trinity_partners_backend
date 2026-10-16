import { GrantPartnerManagerEmployeeReadAccess1780321600000 } from "../../migrations/1780321600000-GrantPartnerManagerEmployeeReadAccess";

describe("GrantPartnerManagerEmployeeReadAccess1780321600000", () => {
  it("grants employee read access to partner_manager idempotently", async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };

    await new GrantPartnerManagerEmployeeReadAccess1780321600000().up(
      queryRunner as any,
    );

    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining("role.name = 'partner_manager'"),
      ["api.portal-employees.read"],
    );
    expect(queryRunner.query.mock.calls[0][0]).toContain("NOT EXISTS");
  });
});
