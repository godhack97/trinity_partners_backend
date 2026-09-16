import { ProtectBuiltInSuperAdmin1780320900000 } from
  "../../migrations/1780320900000-ProtectBuiltInSuperAdmin";

describe("ProtectBuiltInSuperAdmin1780320900000", () => {
  const runUp = async () => {
    const migration = new ProtectBuiltInSuperAdmin1780320900000();
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await migration.up(queryRunner as any);
    return queryRunner.query.mock.calls;
  };

  it("restores or creates the fixed administrator with the super_admin role", async () => {
    const calls = await runUp();
    const sql = calls.map(([statement]) => statement).join("\n");
    const parameters = calls.flatMap(([, values]) => values || []);

    expect(sql).toContain("INSERT INTO users");
    expect(sql).toContain("built_in_admin.role_id = super_admin_role.id");
    expect(sql).toContain("built_in_admin.deleted_at = NULL");
    expect(sql).toContain("INSERT IGNORE INTO user_roles");
    expect(parameters).toContain("sancho97.2011@mail.ru");
    expect(parameters).not.toContain("231654");
  });

  it("protects the user, assignment and system role at database level", async () => {
    const calls = await runUp();
    const sql = calls.map(([statement]) => statement).join("\n");

    expect(sql).toContain("BEFORE DELETE ON users");
    expect(sql).toContain("BEFORE UPDATE ON users");
    expect(sql).toContain("BEFORE DELETE ON user_roles");
    expect(sql).toContain("BEFORE UPDATE ON user_roles");
    expect(sql).toContain("BEFORE DELETE ON roles");
    expect(sql).toContain("BEFORE UPDATE ON roles");
    expect(sql).toContain("SIGNAL SQLSTATE '45000'");
  });
});
