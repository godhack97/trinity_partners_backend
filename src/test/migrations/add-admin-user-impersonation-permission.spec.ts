import { AddAdminUserImpersonationPermission1780321200000 } from "../../migrations/1780321200000-AddAdminUserImpersonationPermission";

describe("AddAdminUserImpersonationPermission1780321200000", () => {
  it("creates the permission and grants it to super_admin", async () => {
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };

    await new AddAdminUserImpersonationPermission1780321200000().up(
      queryRunner as any,
    );

    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO permissions"),
      expect.arrayContaining(["system.admin-users.impersonate"]),
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("role.name = 'super_admin'"),
      ["system.admin-users.impersonate"],
    );
  });
});
