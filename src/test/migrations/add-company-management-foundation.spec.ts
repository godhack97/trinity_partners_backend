import { AddCompanyManagementFoundation1780316200000 } from "../../migrations/1780316200000-AddCompanyManagementFoundation";

describe("AddCompanyManagementFoundation1780316200000", () => {
  const runUp = async () => {
    const migration = new AddCompanyManagementFoundation1780316200000();
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
      hasColumn: jest.fn().mockResolvedValue(false),
      hasTable: jest.fn().mockResolvedValue(false),
      getTable: jest.fn().mockResolvedValue({ foreignKeys: [], indices: [] }),
    };
    await migration.up(queryRunner as any);
    return queryRunner.query.mock.calls;
  };

  it("adds lifecycle fields, history and canonical indexes", async () => {
    const calls = await runUp();
    const sql = calls.map(([statement]) => statement).join("\n");

    expect(sql).toContain("responsible_manager_id");
    expect(sql).toContain("responsible_manager_id int unsigned");
    expect(sql).toContain("review_lock_reason");
    expect(sql).toContain("suspension_reason");
    expect(sql).toContain("CREATE TABLE company_status_history");
    expect(sql).toContain("IDX_companies_status_manager");
    expect(sql).toContain("IDX_companies_inn");
  });

  it("backfills only active users with a partner manager role", async () => {
    const calls = await runUp();
    const sql = calls.map(([statement]) => statement).join("\n");

    expect(sql).toContain("owner_manager.is_activated = 1");
    expect(sql).toContain("validation_manager.is_activated = 1");
    expect(sql).toContain("owner_manager_primary_role.name = 'partner_manager'");
    expect(sql).toContain(
      "validation_manager_secondary_role.name = 'partner_manager'",
    );
    expect(sql).toContain("company.responsible_manager_id");
  });

  it("converts rejected applications to locked pending with the agreed reason", async () => {
    const calls = await runUp();
    const sql = calls.map(([statement]) => statement).join("\n");
    const params = calls.flatMap(([, values]) => values || []);

    expect(sql).toContain("WHERE status = 'reject'");
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("enum('pending', 'accept', 'suspended')");
    expect(params).toContain(
      "Заявка была отклонена до перехода на новую модель модерации",
    );
  });

  it("moves company-linked technical specialists to staff for primary and secondary roles", async () => {
    const calls = await runUp();
    const sql = calls.map(([statement]) => statement).join("\n");

    expect(sql).toContain("primary_role.name <> 'technical_specialist'");
    expect(sql).toContain("secondary_role.name = 'technical_specialist'");
    expect(sql).toContain("SET employee_user.role_id = staff_role.id");
    expect(sql).toContain("DELETE technical_user_role");
    expect(sql).toContain("'api.deals.write'");
    expect(sql).toContain("'api.deals.remove'");
  });
});
