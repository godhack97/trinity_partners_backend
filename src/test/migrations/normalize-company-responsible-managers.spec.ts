import { NormalizeCompanyResponsibleManagers1780316400000 } from "../../migrations/1780316400000-NormalizeCompanyResponsibleManagers";

describe("NormalizeCompanyResponsibleManagers1780316400000", () => {
  const run = async (method: "up" | "down") => {
    const migration = new NormalizeCompanyResponsibleManagers1780316400000();
    const queryRunner = { query: jest.fn().mockResolvedValue(undefined) };
    await migration[method](queryRunner as any);
    return queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join("\n");
  };

  it("logs and clears assignments to inactive or non-partner managers", async () => {
    const sql = await run("up");

    expect(sql).toContain("legacy_manager_assignment_cleared");
    expect(sql).toContain("previous_responsible_manager_id");
    expect(sql).toContain("manager.is_activated <> 1");
    expect(sql).toContain("manager.deleted_at IS NOT NULL");
    expect(sql).toContain("primary_role.name = 'partner_manager'");
    expect(sql).toContain("secondary_role.name = 'partner_manager'");
    expect(sql).toContain("SET company.responsible_manager_id = NULL");
  });

  it("can restore the recorded legacy assignments", async () => {
    const sql = await run("down");

    expect(sql).toContain("JSON_EXTRACT");
    expect(sql).toContain("previous_responsible_manager_id");
    expect(sql).toContain("DELETE FROM company_status_history");
  });
});
