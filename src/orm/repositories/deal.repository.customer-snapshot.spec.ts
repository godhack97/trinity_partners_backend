import { DealRepository } from "./deal.repository";

describe("DealRepository customer snapshots", () => {
  it("clones a legacy shared customer before updating one deal", async () => {
    const dealUpdate = jest.fn().mockResolvedValue({ affected: 1 });
    const dealCount = jest.fn().mockResolvedValue(2);
    const customerUpdate = jest.fn();
    const customerSave = jest.fn().mockResolvedValue({ id: 91 });
    const customerFind = jest.fn().mockResolvedValue({
      id: 30,
      inn: "7707083893",
      inn_normalized: "7707083893",
      email: "old@example.test",
    });
    const getRepository = jest.fn((target) =>
      target === "customers"
        ? {
            findOneBy: customerFind,
            save: customerSave,
            update: customerUpdate,
          }
        : { count: dealCount, update: dealUpdate },
    );
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("FROM deals")) {
        return [{ id: 7, status: "draft", customer_id: 30 }];
      }
      if (sql.includes("FROM customers")) {
        return [
          {
            id: 30,
            inn: "7707083893",
            inn_normalized: "7707083893",
            email: "old@example.test",
          },
        ];
      }
      return [];
    });
    const manager = {
      getRepository,
      transaction: jest.fn(async (work) => work({ getRepository, query })),
    };
    const repository = { manager } as unknown as DealRepository;
    Object.setPrototypeOf(repository, DealRepository.prototype);
    const dealPatch: any = { status: "moderation" };

    await expect(
      DealRepository.prototype.updateDealAndCustomerSnapshot.call(
        repository,
        {
          id: 7,
          status: "draft",
          customer_id: 30,
          customer: { inn_normalized: "7707083893" },
        } as any,
        dealPatch,
        { email: "new@example.test" },
      ),
    ).resolves.toEqual({ customerId: 91 });

    expect(customerUpdate).not.toHaveBeenCalled();
    expect(customerSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: undefined,
        inn_normalized: "7707083893",
        email: "new@example.test",
      }),
    );
    expect(dealUpdate).toHaveBeenCalledWith(
      { id: 7, status: "draft", customer_id: 30 },
      expect.objectContaining({ customer_id: 91 }),
    );
  });

  it("rolls the customer update back when submit changed the deal status first", async () => {
    const customerUpdate = jest.fn();
    const dealUpdate = jest.fn();
    const getRepository = jest.fn((target) =>
      target === "customers"
        ? { update: customerUpdate }
        : { count: jest.fn().mockResolvedValue(1), update: dealUpdate },
    );
    const query = jest.fn(async (sql: string) =>
      sql.includes("FROM deals")
        ? [{ id: 7, status: "moderation", customer_id: 30 }]
        : [],
    );
    const manager = {
      getRepository,
      query,
      transaction: jest.fn(async (work) => work({ getRepository, query })),
    };
    const repository = { manager } as unknown as DealRepository;
    Object.setPrototypeOf(repository, DealRepository.prototype);

    await expect(
      DealRepository.prototype.updateDealAndCustomerSnapshot.call(
        repository,
        {
          id: 7,
          status: "draft",
          customer_id: 30,
          customer: { inn_normalized: "7707083893" },
        } as any,
        { status: "draft" } as any,
        { email: "new@example.test" },
      ),
    ).resolves.toBeNull();

    expect(customerUpdate).not.toHaveBeenCalled();
    expect(dealUpdate).not.toHaveBeenCalled();
  });

  it("locks old and new INN registries before the deal when correcting a draft", async () => {
    const events: string[] = [];
    const dealUpdate = jest.fn().mockResolvedValue({ affected: 1 });
    const customerUpdate = jest.fn().mockResolvedValue({ affected: 1 });
    const getRepository = jest.fn((target) =>
      target === "customers"
        ? { update: customerUpdate }
        : { count: jest.fn().mockResolvedValue(1), update: dealUpdate },
    );
    const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes("SELECT canonical_deal_id")) {
        events.push(`registry:${parameters?.[0]}`);
        return [{ canonical_deal_id: null }];
      }
      if (sql.includes("FROM deals")) {
        events.push("deal");
        return [{ id: 7, status: "draft", customer_id: 30 }];
      }
      if (sql.includes("FROM customers")) {
        return [{ id: 30, inn_normalized: "7707083893" }];
      }
      return [];
    });
    const manager = {
      getRepository,
      query,
      transaction: jest.fn(async (work) => work({ getRepository, query })),
    };
    const repository = { manager } as unknown as DealRepository;
    Object.setPrototypeOf(repository, DealRepository.prototype);

    await DealRepository.prototype.updateDealAndCustomerSnapshot.call(
      repository,
      {
        id: 7,
        status: "draft",
        customer_id: 30,
        customer: { inn_normalized: "7707083893" },
      } as any,
      { status: "draft" } as any,
      { inn: "500100732259", inn_normalized: "500100732259" },
    );

    expect(events).toEqual([
      "registry:500100732259",
      "registry:7707083893",
      "deal",
    ]);
    expect(customerUpdate).toHaveBeenCalledWith(
      30,
      expect.objectContaining({
        inn_normalized: "500100732259",
        bitrix24_company_id: null,
      }),
    );
  });

  it("does not copy a Bitrix company mapping across an INN boundary", async () => {
    const dealUpdate = jest.fn().mockResolvedValue({ affected: 1 });
    const customerSave = jest.fn().mockResolvedValue({ id: 92 });
    const getRepository = jest.fn((target) =>
      target === "customers"
        ? { save: customerSave, update: jest.fn() }
        : { count: jest.fn().mockResolvedValue(2), update: dealUpdate },
    );
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("FROM deals")) {
        return [{ id: 8, status: "draft", customer_id: 31 }];
      }
      if (sql.includes("FROM customers")) {
        return [
          {
            id: 31,
            inn: "7707083893",
            inn_normalized: "7707083893",
            bitrix24_company_id: 445,
          },
        ];
      }
      return [];
    });
    const manager = {
      getRepository,
      query,
      transaction: jest.fn(async (work) => work({ getRepository, query })),
    };
    const repository = { manager } as unknown as DealRepository;
    Object.setPrototypeOf(repository, DealRepository.prototype);

    await DealRepository.prototype.updateDealAndCustomerSnapshot.call(
      repository,
      {
        id: 8,
        status: "draft",
        customer_id: 31,
        customer: { inn_normalized: "7707083893" },
      } as any,
      { status: "draft" } as any,
      { inn: "500100732259", inn_normalized: "500100732259" },
    );

    expect(customerSave).toHaveBeenCalledWith(
      expect.objectContaining({
        inn_normalized: "500100732259",
        bitrix24_company_id: null,
      }),
    );
  });
});
