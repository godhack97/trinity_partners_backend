const {
  ProvisioningInputError,
  buildDistributorProvisioningPlan,
  canonicalizeMapping,
  normalizePhone,
  normalizeRussianInn,
  parseCsv,
} = require("../../scripts/lib/distributor-company-provisioning.cjs");

const mapping = (overrides: Record<string, unknown> = {}) => ({
  source_line: 2,
  legacy_distributor_id: "1",
  legacy_name: "Старый дистрибьютор",
  legal_company_name: "ООО «Альфа»",
  inn: "7707083893",
  owner_first_name: "Иван",
  owner_last_name: "Иванов",
  owner_email: "owner@alpha.ru",
  owner_phone: "+7 (999) 123-45-67",
  responsible_manager_user_id: "7",
  existing_company_id: "10",
  ...overrides,
});

const manager = {
  id: 7,
  email: "manager@trinity.ru",
  phone: "+79990000007",
  first_name: "Пётр",
  last_name: "Петров",
  is_activated: 1,
  email_confirmed: 1,
  user_info_count: 1,
  deleted_at: null,
  role_names: ["partner_manager"],
};

const owner = {
  id: 50,
  email: "owner@alpha.ru",
  phone: "+79991234567",
  first_name: "Иван",
  last_name: "Иванов",
  is_activated: 1,
  email_confirmed: 1,
  user_info_count: 1,
  deleted_at: null,
  role_names: ["partner", "company_admin"],
};

describe("distributor company provisioning planner", () => {
  it("parses quoted CSV fields and rejects a changed header contract", () => {
    const csv = [
      "legacy_distributor_id,legacy_name,legal_company_name,inn,owner_first_name,owner_last_name,owner_email,owner_phone,responsible_manager_user_id,existing_company_id",
      '1,"Старый, дистрибьютор","ООО ""Альфа""",7707083893,Иван,Иванов,owner@alpha.ru,+79991234567,7,10',
    ].join("\r\n");

    expect(parseCsv(csv)).toEqual([
      expect.objectContaining({
        source_line: 2,
        legacy_name: "Старый, дистрибьютор",
        legal_company_name: 'ООО "Альфа"',
      }),
    ]);
    expect(() => parseCsv("legacy_distributor_id,unknown\n1,x")).toThrow(
      ProvisioningInputError,
    );
  });

  it("uses the same strict checksum and stable phone normalization as current input", () => {
    expect(normalizeRussianInn("77 07-083893")).toBe("7707083893");
    expect(normalizeRussianInn("500100732259")).toBe("500100732259");
    expect(normalizeRussianInn("7707083894")).toBeNull();
    expect(normalizeRussianInn("0000000000")).toBeNull();
    expect(normalizePhone("8 (999) 123-45-67")).toBe("+79991234567");
    expect(normalizePhone("123")).toBeNull();
  });

  it("requires a legal form and all owner/manager identity fields", () => {
    expect(canonicalizeMapping(mapping()).issues).toEqual([]);
    expect(
      canonicalizeMapping(
        mapping({
          legal_company_name: "Альфа",
          inn: "",
          owner_email: "not-an-email",
          owner_phone: "123",
          responsible_manager_user_id: "",
        }),
      ).issues.map((entry: { code: string }) => entry.code),
    ).toEqual(
      expect.arrayContaining([
        "INVALID_LEGAL_COMPANY_NAME",
        "INVALID_RUSSIAN_INN",
        "INVALID_OWNER_EMAIL",
        "INVALID_OWNER_PHONE",
        "INVALID_RESPONSIBLE_MANAGER_ID",
      ]),
    );
  });

  it("allows several legacy IDs to reconcile to one exact canonical company", () => {
    const plan = buildDistributorProvisioningPlan({
      mappingRows: [
        mapping(),
        mapping({ source_line: 3, legacy_distributor_id: "2", legacy_name: "Старый 2" }),
      ],
      legacyDistributors: [
        { id: 1, name: "Старый дистрибьютор", deleted_at: "2020-01-01" },
        { id: 2, name: "Старый 2", deleted_at: "2020-01-01" },
      ],
      deals: [
        { id: 101, distributor_id: 1, distributor_company_id: null, deleted_at: null },
        { id: 102, distributor_id: 2, distributor_company_id: 10, deleted_at: null },
      ],
      companies: [{
        id: 10,
        name: "ООО «Альфа»",
        inn: "7707083893",
        owner_id: 50,
        responsible_manager_id: 7,
        partnership_type: "distributor",
        status: "accept",
        deleted_at: null,
      }],
      users: [manager, owner],
      memberships: [{
        id: 1,
        company_id: 10,
        employee_id: 50,
        status: "accept",
        deleted_at: null,
      }],
      schema: { has_staging_table: true, has_distributor_company_id: true },
    });

    expect(plan.issues).toEqual([]);
    expect(plan.rows.map((row: { action: string }) => row.action)).toEqual([
      "backfill_canonical_deals",
      "already_reconciled",
    ]);
    expect(plan.summary).toMatchObject({
      blocker_count: 0,
      stage_ready: true,
      backfill_ready: true,
    });
  });

  it("stages a missing owner for self-registration without inventing credentials", () => {
    const plan = buildDistributorProvisioningPlan({
      mappingRows: [mapping({ existing_company_id: "" })],
      legacyDistributors: [{ id: 1, name: "Старый дистрибьютор", deleted_at: null }],
      deals: [{ id: 101, distributor_id: 1, distributor_company_id: null, deleted_at: null }],
      users: [manager],
      schema: { has_staging_table: true, has_distributor_company_id: true },
    });

    expect(plan.issues).toEqual([]);
    expect(plan.rows[0]).toMatchObject({
      action: "await_owner_self_registration",
      resolution: { owner_user_id: null, company_id: null },
    });
    expect(plan.summary.stage_ready).toBe(true);
    expect(plan.summary.backfill_ready).toBe(false);
  });

  it("requires every referenced legacy ID exactly once and rejects extras", () => {
    const plan = buildDistributorProvisioningPlan({
      mappingRows: [mapping({ legacy_distributor_id: "3", legacy_name: "Лишний" })],
      legacyDistributors: [
        { id: 2, name: "Пропущен", deleted_at: null },
        { id: 3, name: "Лишний", deleted_at: null },
      ],
      deals: [{ id: 1, distributor_id: 2, distributor_company_id: null, deleted_at: null }],
      users: [manager],
      schema: { has_staging_table: true, has_distributor_company_id: true },
    });

    expect(plan.issues.map((entry: { code: string }) => entry.code)).toEqual(
      expect.arrayContaining([
        "MISSING_REFERENCED_LEGACY_DISTRIBUTOR",
        "UNREFERENCED_LEGACY_DISTRIBUTOR",
      ]),
    );
  });

  it("blocks ambiguous identities, conflicting canonical deals, and staged-plan drift", () => {
    const plan = buildDistributorProvisioningPlan({
      mappingRows: [mapping()],
      legacyDistributors: [{ id: 1, name: "Старый дистрибьютор", deleted_at: null }],
      deals: [{ id: 1, distributor_id: 1, distributor_company_id: 99, deleted_at: null }],
      companies: [
        {
          id: 10,
          name: "ООО «Альфа»",
          inn: "7707083893",
          owner_id: 50,
          responsible_manager_id: 7,
          partnership_type: "distributor",
          status: "accept",
          deleted_at: null,
        },
        {
          id: 11,
          name: "ООО «Альфа 2»",
          inn: "7707083893",
          owner_id: 51,
          responsible_manager_id: 7,
          partnership_type: "distributor",
          status: "accept",
          deleted_at: null,
        },
      ],
      users: [manager, owner],
      memberships: [{ id: 1, company_id: 10, employee_id: 50, status: "accept", deleted_at: null }],
      stagedPlans: [{ legacy_distributor_id: 1, mapping_fingerprint: "different" }],
      schema: { has_staging_table: true, has_distributor_company_id: true },
    });

    expect(plan.issues.map((entry: { code: string }) => entry.code)).toEqual(
      expect.arrayContaining([
        "AMBIGUOUS_COMPANY_INN",
        "DEAL_COMPANY_CONFLICT",
        "STAGED_PLAN_CHANGED",
      ]),
    );
    expect(plan.rows[0].action).toBe("blocked");
  });
});
