import { HttpException } from "@nestjs/common";
import { DealService } from "./deal.service";
import { RoleTypes } from "@app/types/RoleTypes";
import { CompanyEmployeeStatus } from "@orm/entities";

const makeUser = (id: number, roles: RoleTypes[]) =>
  ({
    id,
    role: { name: RoleTypes.Employee },
    roles: roles.map((name) => ({ name })),
  }) as any;

const makeService = (overrides: Record<string, any> = {}) => {
  const distributorRepository = {
    findByName: jest.fn().mockResolvedValue(null),
    ...overrides.distributorRepository,
  };
  const customerRepository = {
    ...overrides.customerRepository,
  };
  const dealRepository = {
    findDealsWithFilters: jest.fn().mockResolvedValue([{ id: 1 }]),
    findById: jest.fn().mockResolvedValue({ id: 1, creator_id: 2 }),
    ...overrides.dealRepository,
  };
  const companyRepository = {
    find: jest.fn().mockResolvedValue([]),
    findByOwnerId: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue({ id: 10, owner_id: 1 }),
    ...overrides.companyRepository,
  };
  const bitrix24Service = {
    ...overrides.bitrix24Service,
  };
  const userRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    ...overrides.userRepository,
  };
  const emailConfirmerService = {
    ...overrides.emailConfirmerService,
  };
  const dealDeletionRequestRepository = {
    ...overrides.dealDeletionRequestRepository,
  };
  const companyEmployeeRepository = {
    findOne: jest.fn().mockResolvedValue({
      company_id: 10,
      company: { id: 10, owner_id: 1 },
    }),
    findCompanyEmployeesByCompanyId: jest.fn().mockResolvedValue([
      { status: CompanyEmployeeStatus.Accept, employee_id: 2 },
      { status: CompanyEmployeeStatus.Accept, employee_id: 3 },
    ]),
    ...overrides.companyEmployeeRepository,
  };
  const configuratorDraftRepository = {
    ...overrides.configuratorDraftRepository,
  };
  const configService = {
    get: jest.fn().mockReturnValue("localhost"),
    ...overrides.configService,
  };
  const notificationService = {
    ...overrides.notificationService,
  };

  return {
    service: new DealService(
      distributorRepository as any,
      customerRepository as any,
      dealRepository as any,
      companyRepository as any,
      bitrix24Service as any,
      userRepository as any,
      emailConfirmerService as any,
      dealDeletionRequestRepository as any,
      companyEmployeeRepository as any,
      configuratorDraftRepository as any,
      configService as any,
      notificationService as any,
    ),
    mocks: {
      dealRepository,
      companyRepository,
      companyEmployeeRepository,
      userRepository,
    },
  };
};

describe("DealService business roles", () => {
  it("администратор компании видит сделки всех сотрудников своей компании", async () => {
    const { service, mocks } = makeService();

    await expect(
      service.findAll(makeUser(1, [RoleTypes.CompanyAdmin])),
    ).resolves.toEqual([{ id: 1 }]);

    expect(mocks.dealRepository.findDealsWithFilters).toHaveBeenCalledWith(
      undefined,
      expect.arrayContaining([1, 2, 3]),
    );
  });

  it("внутренний технический специалист видит все сделки без company-привязки", async () => {
    const { service, mocks } = makeService();

    await service.findAll(makeUser(3, [RoleTypes.TechnicalSpecialist]));

    expect(mocks.dealRepository.findDealsWithFilters).toHaveBeenCalledWith(
      undefined,
    );
  });

  it("технический специалист открывает любую сделку только для чтения", async () => {
    const { service } = makeService();

    await expect(
      service.findOne(1, makeUser(3, [RoleTypes.TechnicalSpecialist])),
    ).resolves.toMatchObject({
      id: 1,
      can_update_status: false,
      can_update_fields: false,
      can_update_configurations: false,
    });
  });

  it("ответственный менеджер открывает сделку своей компании только для чтения", async () => {
    const { service } = makeService({
      companyRepository: {
        find: jest.fn().mockResolvedValue([{ id: 10 }]),
      },
    });

    await expect(
      service.findOne(1, makeUser(7, [RoleTypes.PartnerManager])),
    ).resolves.toMatchObject({
      id: 1,
      can_update_status: false,
      can_update_fields: false,
      can_update_configurations: false,
    });
  });

  it("менеджер не открывает сделку чужой active-компании по прямому id", async () => {
    const { service } = makeService({
      companyRepository: {
        find: jest.fn().mockResolvedValue([{ id: 11 }]),
      },
    });

    await expect(
      service.findOne(1, makeUser(7, [RoleTypes.PartnerManager])),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("менеджер продаж видит только свои сделки", async () => {
    const { service, mocks } = makeService();

    await service.findAll(makeUser(4, [RoleTypes.SalesManager]));

    expect(mocks.dealRepository.findDealsWithFilters).toHaveBeenCalledWith(
      undefined,
      [4],
    );
  });

  it("обычный сотрудник не получает список сделок", async () => {
    const { service, mocks } = makeService();

    await expect(service.findAll(makeUser(5, [RoleTypes.Staff]))).resolves.toEqual(
      [],
    );
    expect(mocks.dealRepository.findDealsWithFilters).not.toHaveBeenCalled();
  });

  it("для уведомлений использует канонического ответственного компании", async () => {
    const { service } = makeService({
      companyEmployeeRepository: {
        findOne: jest.fn().mockResolvedValue({
          company_id: 10,
          company: {
            id: 10,
            owner_id: 1,
            responsible_manager_id: 77,
          },
        }),
      },
    });
    const user = { ...makeUser(5, [RoleTypes.Employee]), manager_id: 88 };

    await expect(
      (service as any).getResponsibleManagerId(user),
    ).resolves.toBe(77);
  });

  it("администратор компании открывает сделку сотрудника своей компании", async () => {
    const { service } = makeService();

    await expect(
      service.findOne(1, makeUser(1, [RoleTypes.CompanyAdmin])),
    ).resolves.toMatchObject({
      id: 1,
      creator_id: 2,
      can_update_status: false,
      can_update_configurations: false,
    });
  });

  it("менеджер продаж не открывает чужую сделку", async () => {
    const { service } = makeService();

    await expect(
      service.findOne(1, makeUser(4, [RoleTypes.SalesManager])),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("менеджер продаж открывает свою сделку без права менять статус", async () => {
    const { service } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({ id: 1, creator_id: 4 }),
      },
    });

    await expect(
      service.findOne(1, makeUser(4, [RoleTypes.SalesManager])),
    ).resolves.toMatchObject({
      id: 1,
      creator_id: 4,
      can_update_status: false,
      can_update_configurations: true,
    });
  });
});
