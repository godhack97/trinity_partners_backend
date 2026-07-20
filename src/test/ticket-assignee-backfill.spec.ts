const {
  buildBackfillPlan,
  parseMappingDocument,
} = require("../../scripts/lib/ticket-assignee-backfill.cjs");

describe("ticket assignee backfill plan", () => {
  const eligibleHandlers = {
    partner_manager: [10, 11],
    technical_specialist: [20],
  };

  it("uses an eligible creator manager and the sole technical specialist", () => {
    const plan = buildBackfillPlan({
      tickets: [
        { id: 1, type: "manager", creator_manager_id: 10 },
        { id: 2, type: "tech_specialist", creator_manager_id: 10 },
      ],
      eligibleHandlers,
      explicitMapping: new Map(),
    });

    expect(plan).toEqual({
      planned: [
        {
          ticket_id: 1,
          assignee_id: 10,
          type: "manager",
          source: "eligible_creator_manager",
        },
        {
          ticket_id: 2,
          assignee_id: 20,
          type: "tech_specialist",
          source: "sole_eligible_technical_specialist",
        },
      ],
      blocked: [],
    });
  });

  it("blocks ambiguous rows until an explicit eligible mapping is supplied", () => {
    const tickets = [
      { id: 3, type: "manager", creator_manager_id: null },
      { id: 4, type: "tech_specialist", creator_manager_id: null },
    ];

    expect(
      buildBackfillPlan({
        tickets,
        eligibleHandlers: {
          ...eligibleHandlers,
          technical_specialist: [20, 21],
        },
        explicitMapping: new Map(),
      }).blocked,
    ).toEqual([
      { ticket_id: 3, type: "manager", reason: "creator_manager_missing" },
      {
        ticket_id: 4,
        type: "tech_specialist",
        reason: "technical_specialist_ambiguous",
      },
    ]);

    const mapped = buildBackfillPlan({
      tickets,
      eligibleHandlers: {
        ...eligibleHandlers,
        technical_specialist: [20, 21],
      },
      explicitMapping: new Map([
        [3, 11],
        [4, 21],
      ]),
    });
    expect(mapped.blocked).toEqual([]);
    expect(mapped.planned.map((row) => row.source)).toEqual([
      "explicit_mapping",
      "explicit_mapping",
    ]);
  });

  it("rejects mappings outside the selected tickets or eligible role", () => {
    expect(() =>
      buildBackfillPlan({
        tickets: [{ id: 1, type: "manager", creator_manager_id: null }],
        eligibleHandlers,
        explicitMapping: new Map([[99, 10]]),
      }),
    ).toThrow("mapping ticket 99 is not an active unassigned ticket");

    expect(() =>
      buildBackfillPlan({
        tickets: [{ id: 1, type: "manager", creator_manager_id: null }],
        eligibleHandlers,
        explicitMapping: new Map([[1, 20]]),
      }),
    ).toThrow("assignee 20 for ticket 1 is not an active partner_manager");
  });

  it("validates mapping ids", () => {
    expect(parseMappingDocument({ "3": 11 })).toEqual(new Map([[3, 11]]));
    expect(() => parseMappingDocument([])).toThrow("mapping must be a JSON object");
    expect(() => parseMappingDocument({ nope: 11 })).toThrow(
      "mapping ticket id must be a positive integer",
    );
    expect(() => parseMappingDocument({ "3": 0 })).toThrow(
      "mapping assignee for ticket 3 must be a positive integer",
    );
  });
});
