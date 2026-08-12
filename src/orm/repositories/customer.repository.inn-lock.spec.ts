import { CustomerEntity } from "@orm/entities";
import { CustomerRepository } from "./customer.repository";

const compactSql = (sql: string): string => sql.replace(/\s+/gu, " ").trim();

describe("CustomerRepository normalized INN registry lock", () => {
  it("runs the callback on the transaction manager after locking the registry row", async () => {
    const events: string[] = [];
    const transactionManager = {
      query: jest.fn(async (sql: string) => {
        events.push(compactSql(sql));
        return [];
      }),
    };
    const rootManager = {
      transaction: jest.fn(async (work) => {
        events.push("transaction:start");
        const result = await work(transactionManager);
        events.push("transaction:commit");
        return result;
      }),
    };
    const repository = new CustomerRepository({
      target: CustomerEntity,
      manager: rootManager,
      queryRunner: undefined,
    } as any);

    await expect(
      repository.withNormalizedInnRegistryLock(
        "7707083893",
        async (manager) => {
          expect(manager).toBe(transactionManager);
          events.push("work");
          return 42;
        },
      ),
    ).resolves.toBe(42);

    expect(rootManager.transaction).toHaveBeenCalledTimes(1);
    expect(transactionManager.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO deal_customer_inn_registry"),
      ["7707083893"],
    );
    expect(transactionManager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("FOR UPDATE"),
      ["7707083893"],
    );
    expect(events).toEqual([
      "transaction:start",
      expect.stringContaining("INSERT INTO deal_customer_inn_registry"),
      expect.stringContaining("SELECT canonical_deal_id"),
      "work",
      "transaction:commit",
    ]);
  });

  it("uses the supplied transaction manager for normalized-INN lookups and assignments", async () => {
    const selectBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ bitrix24_company_id: 123 }),
    };
    const updateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    const transactionRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(selectBuilder)
        .mockReturnValueOnce(updateBuilder),
    };
    const transactionManager = {
      getRepository: jest.fn().mockReturnValue(transactionRepository),
    };
    const rootManager = { getRepository: jest.fn() };
    const repository = new CustomerRepository({
      target: CustomerEntity,
      manager: rootManager,
      queryRunner: undefined,
    } as any);

    await expect(
      repository.findBitrixCompanyIdByNormalizedInn(
        "7707083893",
        transactionManager as any,
      ),
    ).resolves.toEqual({ bitrix24_company_id: 123 });
    await expect(
      repository.assignBitrixCompanyIdToNormalizedInn(
        "7707083893",
        123,
        transactionManager as any,
      ),
    ).resolves.toEqual({ affected: 2 });

    expect(transactionManager.getRepository).toHaveBeenCalledTimes(2);
    expect(rootManager.getRepository).not.toHaveBeenCalled();
    expect(updateBuilder.set).toHaveBeenCalledWith({
      bitrix24_company_id: 123,
    });
    expect(updateBuilder.where).toHaveBeenCalledWith(
      "inn_normalized = :innNormalized",
      { innNormalized: "7707083893" },
    );
  });
});
