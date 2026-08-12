import { DealRepository } from "./deal.repository";

describe("DealRepository duplicate INN registry", () => {
  function makeRepository(options: {
    storedCanonicalId?: number | null;
    matchingDealIds: number[];
    submitAffected?: number;
    lockedInns?: string[];
    initialNormalizedInn?: string;
    lockedParticipants?: Record<string, unknown>;
  }) {
    let lockAttempt = 0;
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) => {
      if (sql.includes("SELECT canonical_deal_id")) {
        return [{ canonical_deal_id: options.storedCanonicalId ?? null }];
      }
      if (sql.includes("SELECT deal.status")) {
        const inn =
          options.lockedInns?.[lockAttempt] ||
          options.initialNormalizedInn ||
          "7707083893";
        lockAttempt += 1;
        return [
          {
            status: "draft",
            inn_normalized: inn,
            ...options.lockedParticipants,
          },
        ];
      }
      if (sql.includes("SELECT deal.id")) {
        return options.matchingDealIds.map((id) => ({ id }));
      }
      return { affectedRows: 1 };
    });
    const update = jest
      .fn()
      .mockResolvedValue({ affected: options.submitAffected ?? 1 });
    const getRepository = jest.fn(() => ({ update }));
    const manager = {
      query,
      getRepository,
      transaction: jest.fn(async (work) => work({ query, getRepository })),
    };
    const repository = {
      manager,
    } as unknown as DealRepository;
    Object.setPrototypeOf(repository, DealRepository.prototype);

    return { repository, manager, query, update };
  }

  it("keeps the locked canonical deal and marks a later submission pending", async () => {
    const { repository, query } = makeRepository({
      storedCanonicalId: 10,
      matchingDealIds: [10, 20],
    });

    await expect(
      DealRepository.prototype.claimCustomerInnOnSubmit.call(
        repository,
        20,
        "7707083893",
        { status: "moderation" as any },
      ),
    ).resolves.toEqual({
      canonicalDealId: 10,
      matchingDealIds: [10, 20],
    });

    const duplicateUpdate = query.mock.calls.find(([sql]) =>
      sql.includes("duplicate_review_status = 'pending'"),
    );
    expect(duplicateUpdate?.[1]).toEqual([10, 20]);
  });

  it("repairs a missing registry anchor from the earliest submitted match", async () => {
    const { repository, query } = makeRepository({
      storedCanonicalId: 99,
      matchingDealIds: [12, 13],
      initialNormalizedInn: "500100732259",
    });

    await expect(
      DealRepository.prototype.claimCustomerInnOnSubmit.call(
        repository,
        13,
        "500100732259",
        { status: "moderation" as any },
      ),
    ).resolves.toEqual({
      canonicalDealId: 12,
      matchingDealIds: [12, 13],
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET canonical_deal_id = ?"),
      [12, "500100732259"],
    );
  });

  it("makes the first submitted deal the anchor without marking it duplicate", async () => {
    const { repository, query } = makeRepository({
      matchingDealIds: [31],
    });

    await expect(
      DealRepository.prototype.claimCustomerInnOnSubmit.call(
        repository,
        31,
        "7707083893",
        { status: "moderation" as any },
      ),
    ).resolves.toEqual({
      canonicalDealId: 31,
      matchingDealIds: [31],
    });

    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes("duplicate_review_status = NULL"),
      ),
    ).toBe(true);
  });

  it("claims a draft only once after acquiring the INN lock", async () => {
    const { repository, query, update } = makeRepository({
      matchingDealIds: [],
      submitAffected: 0,
    });

    await expect(
      DealRepository.prototype.claimCustomerInnOnSubmit.call(
        repository,
        40,
        "7707083893",
        { status: "moderation" as any },
      ),
    ).resolves.toBeNull();

    expect(update).toHaveBeenCalledWith(
      { id: 40, status: "draft" },
      { status: "moderation" },
    );
    expect(
      query.mock.calls.some(([sql]) => sql.includes("SELECT deal.id")),
    ).toBe(false);
    expect(
      query.mock.calls.some(([sql]) =>
        sql.includes("duplicate_review_status = 'pending'"),
      ),
    ).toBe(false);
  });

  it("retries with the current INN when an edit committed while submit waited on the old registry lock", async () => {
    const { repository, query } = makeRepository({
      matchingDealIds: [40],
      lockedInns: ["500100732259", "500100732259"],
    });

    await expect(
      DealRepository.prototype.claimCustomerInnOnSubmit.call(
        repository,
        40,
        "7707083893",
        { status: "moderation" as any },
      ),
    ).resolves.toEqual({
      canonicalDealId: 40,
      matchingDealIds: [40],
    });

    const registryLockInns = query.mock.calls
      .filter(([sql]) => sql.includes("SELECT canonical_deal_id"))
      .map(([, parameters]) => parameters?.[0]);
    expect(registryLockInns).toEqual(["7707083893", "500100732259"]);
  });

  it("does not overwrite a participant changed before submit acquired the deal lock", async () => {
    const { repository, update } = makeRepository({
      matchingDealIds: [],
      lockedParticipants: {
        distributor_company_id: 11,
        integrator_company_id: 99,
        integrator_name: "Новый интегратор",
        integrator_inn: "500100732259",
      },
    });

    await expect(
      DealRepository.prototype.claimCustomerInnOnSubmit.call(
        repository,
        40,
        "7707083893",
        { status: "moderation" as any, integrator_company_id: 12 },
        {
          distributorCompanyId: 11,
          integratorCompanyId: 12,
          integratorName: "Старый интегратор",
          integratorInn: "7707083893",
        },
      ),
    ).resolves.toBeNull();

    expect(update).not.toHaveBeenCalled();
  });
});
