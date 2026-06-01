import { NormalizeEmployeeBusinessRoles1780000000001 } from "../../migrations/1780000000001-NormalizeEmployeeBusinessRoles";

describe("NormalizeEmployeeBusinessRoles1780000000001", () => {
  it("удаляет user_roles.employee у пользователей с бизнес-ролью сотрудника", async () => {
    const migration = new NormalizeEmployeeBusinessRoles1780000000001();
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryRunner as any);

    const sql = queryRunner.query.mock.calls[0][0];
    expect(sql).toContain("DELETE employee_role FROM user_roles employee_role");
    expect(sql).toContain("SELECT DISTINCT business_role.user_id");
    expect(sql).toContain(
      "users_with_business_role.user_id = employee_role.user_id",
    );
    expect(sql).toContain("employee.name = 'employee'");
    expect(sql).toContain(
      "business.name IN ('sales_manager', 'technical_specialist', 'staff')",
    );
  });
});
