const {
  buildDistributorCompanyAudit,
  classifyDistributorCandidates,
  normalizeCompanyName,
} = require("../../scripts/lib/deal-distributor-company-audit.cjs");

describe("deal distributor company audit", () => {
  it("normalizes Unicode, case, and whitespace without fuzzy punctuation changes", () => {
    expect(normalizeCompanyName("  ООО\tТРИНИТИ СЕРВЕРС  ")).toBe(
      "ооо тринити серверс",
    );
    expect(normalizeCompanyName("ＡＢＣ")).toBe("abc");
    expect(normalizeCompanyName("ООО «Тринити»")).not.toBe(
      normalizeCompanyName("ООО Тринити"),
    );
    expect(normalizeCompanyName(null)).toBe("");
  });

  it.each([
    [[], "unmapped"],
    [[{ partnership_type: "distributor", status: "accept", deleted_at: null }], "exact"],
    [[{ partnership_type: "integrator", status: "accept", deleted_at: null }], "wrong_type"],
    [[{ partnership_type: "distributor", status: "pending", deleted_at: null }], "inactive"],
    [
      [
        { partnership_type: "distributor", status: "accept", deleted_at: null },
        { partnership_type: "distributor", status: "accept", deleted_at: null },
      ],
      "ambiguous",
    ],
    [[{ partnership_type: "distributor", status: "accept", deleted_at: "2026-01-01" }], "unmapped"],
  ])("classifies candidate set %# as %s", (candidates, classification) => {
    expect(classifyDistributorCandidates(candidates)).toBe(classification);
  });

  it("matches by normalized name and builds readiness summaries", () => {
    const audit = buildDistributorCompanyAudit({
      distributors: [
        { id: 1, name: "  Альфа ", deleted_at: null },
        { id: 2, name: "Бета", deleted_at: null },
        { id: 3, name: "Гамма", deleted_at: "2026-01-01" },
        { id: 4, name: "Дельта", deleted_at: null },
        { id: 5, name: "Эпсилон", deleted_at: "2026-01-01" },
      ],
      companies: [
        {
          id: 10,
          name: "АЛЬФА",
          partnership_type: "distributor",
          status: "accept",
          deleted_at: null,
        },
        {
          id: 20,
          name: "Бета",
          partnership_type: "integrator",
          status: "accept",
          deleted_at: null,
        },
        {
          id: 30,
          name: "Гамма",
          partnership_type: "distributor",
          status: "accept",
          deleted_at: null,
        },
        {
          id: 31,
          name: " ГАММА ",
          partnership_type: "distributor",
          status: "accept",
          deleted_at: null,
        },
        {
          id: 40,
          name: "Дельта",
          partnership_type: "distributor",
          status: "accept",
          deleted_at: "2026-01-01",
        },
      ],
      dealCountsByDistributorId: new Map([
        [1, 5],
        [2, 2],
        [3, 1],
      ]),
    });

    expect(audit.rows.map((row) => row.classification)).toEqual([
      "exact",
      "wrong_type",
      "ambiguous",
      "unmapped",
      "unmapped",
    ]);
    expect(audit.rows[0]).toMatchObject({
      normalized_name: "альфа",
      affected_nondeleted_deals: 5,
      active_candidate_count: 1,
    });
    expect(audit.summary).toEqual({
      total_distributors: 5,
      active_distributors: 3,
      soft_deleted_distributors: 2,
      affected_nondeleted_deals: 8,
      classification_counts: {
        exact: 1,
        unmapped: 2,
        ambiguous: 1,
        wrong_type: 1,
        inactive: 0,
      },
      active_distributor_classification_counts: {
        exact: 1,
        unmapped: 1,
        ambiguous: 0,
        wrong_type: 1,
        inactive: 0,
      },
      referenced_distributor_classification_counts: {
        exact: 1,
        unmapped: 0,
        ambiguous: 1,
        wrong_type: 1,
        inactive: 0,
      },
      readiness_blockers: {
        total: 3,
        legacy_distributor_ids: [2, 3, 4],
        unmapped: 1,
        ambiguous: 1,
        wrong_type: 1,
        inactive: 0,
      },
      ignored_soft_deleted_unreferenced: 1,
      migration_ready: false,
    });
  });
});
