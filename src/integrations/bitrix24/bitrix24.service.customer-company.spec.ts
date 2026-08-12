import { of, throwError } from "rxjs";
import { Bitrix24Service } from "./bitrix24.service";

describe("Bitrix24Service customer company identity", () => {
  const customer = (id: number) => ({
    id,
    first_name: "Иван",
    last_name: "Иванов",
    company_name: "ООО Заказчик",
    email: "customer@example.test",
    inn: "7707083893",
    inn_normalized: "7707083893",
  });

  it("reuses a known Bitrix company strictly by normalized INN", async () => {
    const transactionManager = { name: "transaction-manager" };
    const customerRepository = {
      findBitrixCompanyIdByNormalizedInn: jest
        .fn()
        .mockResolvedValue({ bitrix24_company_id: 123 }),
      assignBitrixCompanyIdToNormalizedInn: jest
        .fn()
        .mockResolvedValue({ affected: 2 }),
      withNormalizedInnRegistryLock: jest.fn(async (_inn, work) =>
        work(transactionManager),
      ),
    };
    const httpService = { post: jest.fn() };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      {} as any,
      customerRepository as any,
    );

    await expect(
      service.createCustomerCompany(customer(8) as any),
    ).resolves.toBe(123);

    expect(
      customerRepository.findBitrixCompanyIdByNormalizedInn,
    ).toHaveBeenCalledWith("7707083893", transactionManager);
    expect(
      customerRepository.withNormalizedInnRegistryLock,
    ).toHaveBeenCalledWith("7707083893", expect.any(Function));
    expect(
      customerRepository.assignBitrixCompanyIdToNormalizedInn,
    ).toHaveBeenCalledWith("7707083893", 123, transactionManager);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("serializes concurrent snapshots and creates only one Bitrix company per INN", async () => {
    const transactionManager = { name: "transaction-manager" };
    let knownBitrixCompanyId: number | null = null;
    let lockQueue = Promise.resolve<unknown>(undefined);
    const customerRepository = {
      findBitrixCompanyIdByNormalizedInn: jest.fn(async () =>
        knownBitrixCompanyId
          ? { bitrix24_company_id: knownBitrixCompanyId }
          : null,
      ),
      assignBitrixCompanyIdToNormalizedInn: jest.fn(
        async (_inn, bitrixCompanyId) => {
          knownBitrixCompanyId = bitrixCompanyId;
          return { affected: 2 };
        },
      ),
      withNormalizedInnRegistryLock: jest.fn((_inn, work) => {
        const result = lockQueue.then(() => work(transactionManager));
        lockQueue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      }),
    };
    const httpService = {
      post: jest.fn((url: string, _body?: unknown) => {
        if (url.endsWith("/crm.company.list.json")) {
          return of({ data: { result: [] } });
        }
        if (url.endsWith("/crm.company.add.json")) {
          return of({ data: { result: "555" } });
        }
        throw new Error(`Unexpected Bitrix24 request: ${url}`);
      }),
    };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      {} as any,
      customerRepository as any,
    );

    await expect(
      Promise.all([
        service.createCustomerCompany(customer(8) as any),
        service.createCustomerCompany(customer(9) as any),
      ]),
    ).resolves.toEqual([555, 555]);

    expect(httpService.post).toHaveBeenCalledTimes(2);
    expect(
      httpService.post.mock.calls.filter(([url]) =>
        String(url).endsWith("/crm.company.add.json"),
      ),
    ).toHaveLength(1);
    expect(
      customerRepository.findBitrixCompanyIdByNormalizedInn,
    ).toHaveBeenCalledTimes(2);
    expect(
      customerRepository.assignBitrixCompanyIdToNormalizedInn,
    ).toHaveBeenCalledTimes(2);
    expect(
      customerRepository.assignBitrixCompanyIdToNormalizedInn,
    ).toHaveBeenNthCalledWith(
      1,
      "7707083893",
      555,
      transactionManager,
    );
  });

  it("does not report success when the Bitrix ID cannot be persisted", async () => {
    const transactionManager = { name: "transaction-manager" };
    const customerRepository = {
      findBitrixCompanyIdByNormalizedInn: jest.fn().mockResolvedValue(null),
      assignBitrixCompanyIdToNormalizedInn: jest
        .fn()
        .mockResolvedValue({ affected: 0 }),
      withNormalizedInnRegistryLock: jest.fn(async (_inn, work) =>
        work(transactionManager),
      ),
    };
    const httpService = {
      post: jest.fn((url: string) => {
        if (url.endsWith("/crm.company.list.json")) {
          return of({ data: { result: [] } });
        }
        if (url.endsWith("/crm.company.add.json")) {
          return of({ data: { result: 555 } });
        }
        throw new Error(`Unexpected Bitrix24 request: ${url}`);
      }),
    };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      {} as any,
      customerRepository as any,
    );

    await expect(
      service.createCustomerCompany(customer(8) as any),
    ).resolves.toBeNull();
  });

  it("reuses an existing remote company found by exact customer INN", async () => {
    const transactionManager = { name: "transaction-manager" };
    const customerRepository = {
      findBitrixCompanyIdByNormalizedInn: jest.fn().mockResolvedValue(null),
      assignBitrixCompanyIdToNormalizedInn: jest
        .fn()
        .mockResolvedValue({ affected: 2 }),
      withNormalizedInnRegistryLock: jest.fn(async (_inn, work) =>
        work(transactionManager),
      ),
    };
    const httpService = {
      post: jest.fn().mockReturnValue(
        of({
          data: {
            result: [
              { ID: "777", UF_CRM_68500D3660B6A: "7707083893" },
            ],
          },
        }),
      ),
    };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      {} as any,
      customerRepository as any,
    );

    await expect(
      service.createCustomerCompany(customer(8) as any),
    ).resolves.toBe(777);

    expect(httpService.post).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      "https://bitrix.test/crm.company.list.json",
      {
        filter: { "=UF_CRM_68500D3660B6A": "7707083893" },
        select: ["ID", "UF_CRM_68500D3660B6A"],
        order: { ID: "ASC" },
      },
    );
    expect(
      customerRepository.assignBitrixCompanyIdToNormalizedInn,
    ).toHaveBeenCalledWith("7707083893", 777, transactionManager);
  });

  it("propagates an authoritative lookup error and never adds a company", async () => {
    const customerRepository = {
      findBitrixCompanyIdByNormalizedInn: jest.fn().mockResolvedValue(null),
      assignBitrixCompanyIdToNormalizedInn: jest.fn(),
      withNormalizedInnRegistryLock: jest.fn(async (_inn, work) => work({})),
    };
    const httpService = {
      post: jest
        .fn()
        .mockReturnValue(throwError(() => new Error("lookup timeout"))),
    };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      {} as any,
      customerRepository as any,
    );
    jest.spyOn(service as any, "delay").mockResolvedValue(undefined);

    await expect(
      service.createCustomerCompany(customer(8) as any),
    ).rejects.toThrow("lookup timeout");

    expect(httpService.post).toHaveBeenCalledTimes(3);
    expect(
      httpService.post.mock.calls.some(([url]) =>
        String(url).endsWith("/crm.company.add.json"),
      ),
    ).toBe(false);
  });

  it("adds only once after a clean miss and recovers an uncertain add on the next lookup", async () => {
    const transactionManager = { name: "transaction-manager" };
    const customerRepository = {
      findBitrixCompanyIdByNormalizedInn: jest.fn().mockResolvedValue(null),
      assignBitrixCompanyIdToNormalizedInn: jest
        .fn()
        .mockResolvedValue({ affected: 2 }),
      withNormalizedInnRegistryLock: jest.fn(async (_inn, work) =>
        work(transactionManager),
      ),
    };
    let remoteCompanyExists = false;
    const httpService = {
      post: jest.fn((url: string, _body?: unknown) => {
        if (url.endsWith("/crm.company.list.json")) {
          return of({
            data: {
              result: remoteCompanyExists ? [{ ID: "888" }] : [],
            },
          });
        }
        if (url.endsWith("/crm.company.add.json")) {
          remoteCompanyExists = true;
          return throwError(() => new Error("response timeout"));
        }
        throw new Error(`Unexpected Bitrix24 request: ${url}`);
      }),
    };
    const service = new Bitrix24Service(
      httpService as any,
      { get: jest.fn().mockReturnValue("https://bitrix.test") } as any,
      {} as any,
      customerRepository as any,
    );
    const formattedCustomer = {
      ...customer(8),
      inn: "7707-083-893",
    };

    await expect(
      service.createCustomerCompany(formattedCustomer as any),
    ).resolves.toBeNull();
    await expect(
      service.createCustomerCompany(formattedCustomer as any),
    ).resolves.toBe(888);

    const addCalls = httpService.post.mock.calls.filter(([url]) =>
      String(url).endsWith("/crm.company.add.json"),
    );
    expect(addCalls).toHaveLength(1);
    expect(addCalls[0][1]).toEqual(
      expect.objectContaining({
        fields: expect.objectContaining({
          UF_CRM_68500D3660B6A: "7707083893",
        }),
      }),
    );
    expect(
      customerRepository.assignBitrixCompanyIdToNormalizedInn,
    ).toHaveBeenCalledWith("7707083893", 888, transactionManager);
  });
});
