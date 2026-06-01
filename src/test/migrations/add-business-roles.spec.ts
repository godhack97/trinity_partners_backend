import { AddBusinessRoles1780000000000 } from "../../migrations/1780000000000-AddBusinessRoles";

describe("AddBusinessRoles1780000000000", () => {
  const runUp = async () => {
    const migration = new AddBusinessRoles1780000000000();
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryRunner as any);

    return queryRunner.query;
  };

  it("создает четыре бизнес-роли", async () => {
    const query = await runUp();

    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "company_admin",
      "Администратор компании",
      "company_admin",
    ]);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "sales_manager",
      "Менеджер по продажам",
      "sales_manager",
    ]);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "technical_specialist",
      "Технический специалист",
      "technical_specialist",
    ]);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "staff",
      "Сотрудник без доступа к сделкам и конфигурациям",
      "staff",
    ]);
  });

  it("выдает staff только профильные и портальные права без сделок и конфигуратора", async () => {
    const query = await runUp();
    const staffPermissionCalls = query.mock.calls.filter(
      ([, params]) => params?.[1] === "staff",
    );
    const permissions = staffPermissionCalls.map(([, params]) => params[0]);

    expect(permissions).toEqual(
      expect.arrayContaining([
        "api.profile.read",
        "api.profile.write",
        "menu.dashboard.read",
        "menu.profile.read",
        "menu.news.read",
      ]),
    );
    expect(permissions).not.toContain("api.deals.read");
    expect(permissions).not.toContain("api.configurator.read");
  });

  it("мигрирует существующих партнеров и employee_admin в company_admin", async () => {
    const query = await runUp();
    const sql = query.mock.calls.map(([sqlText]) => sqlText).join("\n");

    expect(sql).toContain("JOIN roles r ON r.name = 'company_admin'");
    expect(sql).toContain("WHERE cr.name IN ('partner', 'employee_admin')");
  });

  it("мигрирует существующих employee в sales_manager", async () => {
    const query = await runUp();
    const sql = query.mock.calls.map(([sqlText]) => sqlText).join("\n");

    expect(sql).toContain("JOIN roles r ON r.name = 'sales_manager'");
    expect(sql).toContain("WHERE cr.name = 'employee'");
  });
});
