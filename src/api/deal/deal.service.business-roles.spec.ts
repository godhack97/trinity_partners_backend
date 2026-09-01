import { HttpException } from "@nestjs/common";
import { DealService } from "./deal.service";
import { RoleTypes } from "@app/types/RoleTypes";
import {
  CompanyEmployeeStatus,
  CompanyStatus,
  DealStatus,
  PartnershipType,
} from "@orm/entities";

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
    findDealsWithFilters: jest.fn().mockResolvedValue([
      {
        id: 1,
        creator_id: 2,
        creator_company_id: 10,
        status: DealStatus.Draft,
      },
    ]),
    findById: jest
      .fn()
      .mockResolvedValue({
        id: 1,
        creator_id: 2,
        creator_company_id: 10,
        status: DealStatus.Draft,
      }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    updateDealAndCustomerSnapshot: jest
      .fn()
      .mockResolvedValue({ customerId: 30 }),
    hasPendingDuplicateReferences: jest.fn().mockResolvedValue(false),
    ...overrides.dealRepository,
  };
  const companyRepository = {
    find: jest.fn().mockResolvedValue([]),
    findByOwnerId: jest.fn().mockResolvedValue(null),
    findUniqueAcceptedByUserId: jest.fn(),
    findById: jest.fn().mockResolvedValue({ id: 10, owner_id: 1 }),
    findAcceptedDistributorByName: jest.fn().mockResolvedValue(null),
    findAcceptedIntegratorByInn: jest.fn().mockResolvedValue(null),
    ...overrides.companyRepository,
  };
  const bitrix24Service = {
    ...overrides.bitrix24Service,
  };
  const userRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findByIdWithUserInfo: jest.fn().mockResolvedValue(null),
    findByIdWithPermissions: jest.fn().mockImplementation(async (id) => ({
      id,
      is_activated: true,
      role: { name: RoleTypes.PartnerManager },
      roles: [],
    })),
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
      company: {
        id: 10,
        owner_id: 1,
        name: "Интегратор",
        inn: "7700000000",
        partnership_type: PartnershipType.Integrator,
        status: CompanyStatus.Accept,
      },
    }),
    findCompanyEmployeesByCompanyId: jest.fn().mockResolvedValue([
      { status: CompanyEmployeeStatus.Accept, employee_id: 2 },
      { status: CompanyEmployeeStatus.Accept, employee_id: 3 },
      { status: CompanyEmployeeStatus.Accept, employee_id: 4 },
    ]),
    ...overrides.companyEmployeeRepository,
  };
  companyRepository.findUniqueAcceptedByUserId.mockImplementation(
    async (userId: number) =>
      (await companyRepository.findByOwnerId(userId)) ||
      (await companyEmployeeRepository.findOne({
        where: {
          employee_id: userId,
          status: CompanyEmployeeStatus.Accept,
        },
      }))?.company ||
      null,
  );
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
    ).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        creator_id: 2,
        can_comment: false,
        can_view_configuration: true,
        can_decide: false,
      }),
    ]);

    expect(mocks.dealRepository.findDealsWithFilters).toHaveBeenCalledWith(
      { companyId: 10 },
      undefined,
      1,
    );
  });

  it("внутренний технический специалист видит все сделки без company-привязки", async () => {
    const { service, mocks } = makeService();

    await expect(
      service.findAll(makeUser(3, [RoleTypes.TechnicalSpecialist])),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        can_comment: false,
        can_view_configuration: true,
        can_decide: false,
        can_update_configurations: false,
      }),
    ]);

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
      can_comment: false,
      can_view_configuration: true,
      can_decide: false,
    });
  });

  it("суперадминистратор может комментировать и принимать решение", async () => {
    const { service } = makeService();

    await expect(
      service.findOne(1, makeUser(8, [RoleTypes.SuperAdmin])),
    ).resolves.toMatchObject({
      id: 1,
      can_comment: true,
      can_view_configuration: true,
      can_decide: true,
      can_update_status: true,
    });
  });

  it("не раскрывает партнёру внутреннюю связь и комментарий проверки дубля", async () => {
    const { service } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          creator_id: 2,
          creator_company_id: 10,
          status: DealStatus.Draft,
          duplicate_of_deal_id: 99,
          duplicate_review_status: "pending",
          duplicate_review_comment: "Внутренняя проверка",
        }),
      },
    });

    const result = await service.findOne(
      1,
      makeUser(1, [RoleTypes.CompanyAdmin]),
    );

    expect(result).not.toHaveProperty("duplicate_of_deal_id");
    expect(result).not.toHaveProperty("duplicate_review_status");
    expect(result).not.toHaveProperty("duplicate_review_comment");
  });

  it("ответственный менеджер может полностью вести закреплённую сделку", async () => {
    const { service } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          creator_id: 2,
          status: DealStatus.Draft,
          responsible_manager_id: 7,
        }),
      },
      companyEmployeeRepository: {
        findOne: jest.fn().mockResolvedValue({
          company_id: 10,
          company: { id: 10, responsible_manager_id: 7 },
        }),
      },
    });

    await expect(
      service.findOne(1, makeUser(7, [RoleTypes.PartnerManager])),
    ).resolves.toMatchObject({
      id: 1,
      can_update_status: true,
      can_update_fields: true,
      can_update_configurations: true,
      can_comment: true,
      can_view_configuration: true,
      can_decide: true,
    });
  });

  it("сотрудник вендора не получает право менять участников сделки", async () => {
    const vendorCompany = {
      id: 10,
      owner_id: 1,
      name: "Вендор",
      partnership_type: PartnershipType.Vendor,
      status: CompanyStatus.Accept,
      responsible_manager_id: 7,
    };
    const { service } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          creator_id: 2,
          status: DealStatus.Draft,
          responsible_manager_id: 7,
        }),
      },
      companyEmployeeRepository: {
        findOne: jest.fn().mockResolvedValue({
          company_id: vendorCompany.id,
          company: vendorCompany,
        }),
      },
    });

    await expect(
      service.findOne(1, makeUser(7, [RoleTypes.PartnerManager])),
    ).resolves.toMatchObject({
      can_update_fields: true,
      can_assign_participants: false,
    });
  });

  it("сотрудник интегратора сохраняет право менять участников своей сделки", async () => {
    const { service } = makeService();

    await expect(
      service.findOne(1, makeUser(2, [RoleTypes.CompanyAdmin])),
    ).resolves.toMatchObject({
      can_update_fields: true,
      can_assign_participants: true,
    });
  });

  it("менеджер не открывает сделку чужой active-компании по прямому id", async () => {
    const { service } = makeService();

    await expect(
      service.findOne(1, makeUser(7, [RoleTypes.PartnerManager])),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("показывает дистрибьютору чужую сделку только после регистрации", () => {
    const { service } = makeService();
    const company = {
      id: 10,
      name: "Дистрибьютор",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    } as any;
    const moderationDeal = {
      creator_id: 99,
      distributor_company_id: company.id,
      status: DealStatus.Moderation,
    };
    const registeredDeal = {
      ...moderationDeal,
      status: DealStatus.Registered,
    };

    expect(
      (service as any).isDealVisibleForCompany(
        moderationDeal,
        company,
        new Set(),
      ),
    ).toBe(false);
    expect(
      (service as any).isDealVisibleForCompany(
        registeredDeal,
        company,
        new Set(),
      ),
    ).toBe(true);
  });

  it("всегда показывает компании её собственный черновик", () => {
    const { service } = makeService();
    const company = {
      id: 10,
      name: "Дистрибьютор",
      partnership_type: PartnershipType.Distributor,
    } as any;

    expect(
      (service as any).isDealVisibleForCompany(
        {
          creator_id: 2,
          creator_company_id: company.id,
          status: DealStatus.Draft,
        },
        company,
        new Set([2]),
      ),
    ).toBe(true);
  });

  it("менеджер продаж не получает черновик коллеги в списке", async () => {
    const { service, mocks } = makeService();

    await expect(
      service.findAll(makeUser(4, [RoleTypes.SalesManager])),
    ).resolves.toEqual([]);

    expect(mocks.dealRepository.findDealsWithFilters).toHaveBeenCalledWith(
      { companyId: 10 },
      undefined,
      4,
    );
  });

  it("менеджер продаж не открывает черновик коллеги по прямому id", async () => {
    const { service } = makeService();

    await expect(
      service.findOne(1, makeUser(4, [RoleTypes.SalesManager])),
    ).rejects.toBeInstanceOf(HttpException);
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
      (service as any).resolveResponsibleManagerSnapshot(user, {
        id: 10,
        responsible_manager_id: 77,
      }),
    ).resolves.toBe(77);
  });

  it("не выбирает получателей уведомления по legacy имени или ИНН", async () => {
    const { service, mocks } = makeService();
    jest
      .spyOn(service as any, "findTrinityDealAdminIds")
      .mockResolvedValue([]);
    jest.spyOn(service as any, "getDealCreatorCompany").mockResolvedValue(null);
    const companyAdmins = jest
      .spyOn(service as any, "getCompanyAdminUserIds")
      .mockResolvedValue([55]);

    await expect(
      (service as any).getDealStatusNotificationRecipientIds({
        id: 1,
        creator_id: 99,
        distributor: { name: "Совпадающее имя" },
        integrator_inn: "7700000000",
        status: DealStatus.Registered,
      }),
    ).resolves.toEqual([]);

    expect(companyAdmins).not.toHaveBeenCalled();
    expect(
      mocks.companyRepository.findAcceptedDistributorByName,
    ).not.toHaveBeenCalled();
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
      can_comment: false,
      can_view_configuration: true,
      can_decide: false,
    });
  });

  it("вторая сторона видит конфигурацию без прав комментировать или менять её", async () => {
    const { service } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          creator_id: 99,
          integrator_company_id: 10,
          status: DealStatus.Moderation,
        }),
      },
    });

    await expect(
      service.findOne(1, makeUser(1, [RoleTypes.CompanyAdmin])),
    ).resolves.toMatchObject({
      id: 1,
      can_update_configurations: false,
      can_comment: false,
      can_view_configuration: true,
      can_decide: false,
    });
  });

  it("менеджер продаж не открывает сделку посторонней компании", async () => {
    const { service } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          creator_id: 99,
          integrator_company_id: 999,
          status: DealStatus.Registered,
        }),
      },
    });

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
      can_comment: true,
      can_view_configuration: true,
      can_decide: false,
    });
  });

  it("запрещает второй стороне комментировать сделку через прямой API", async () => {
    const { service, mocks } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          creator_id: 99,
          integrator_company_id: 10,
          status: DealStatus.Moderation,
        }),
      },
    });

    await expect(
      service.addComment(
        1,
        makeUser(1, [RoleTypes.CompanyAdmin]),
        { text: "Комментарий" } as any,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.dealRepository.update).not.toHaveBeenCalled();
  });

  it("запрещает техническому специалисту комментировать через прямой API", async () => {
    const { service, mocks } = makeService();

    await expect(
      service.addComment(
        1,
        makeUser(3, [RoleTypes.TechnicalSpecialist]),
        { text: "Комментарий" } as any,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.dealRepository.update).not.toHaveBeenCalled();
  });

  it("не позволяет обновлением сохранить текстовые реквизиты неизвестного интегратора", async () => {
    const { service, mocks } = makeService();

    await expect(
      service.update(1, makeUser(2, [RoleTypes.CompanyAdmin]), {
        integrator_name: "Неизвестный интегратор",
        integrator_inn: "7700000099",
      } as any),
    ).rejects.toMatchObject({ status: 400 });

    expect(
      mocks.companyRepository.findAcceptedIntegratorByInn,
    ).toHaveBeenCalledWith("7700000099");
  });

  it.each([
    ["дистрибьютора", { distributor_company_id: 20 }],
    ["интегратора", { integrator_company_id: 30 }],
  ])(
    "запрещает сотруднику вендора менять %s через прямой API",
    async (_participant, participantPatch) => {
      const vendorCompany = {
        id: 10,
        owner_id: 1,
        name: "Вендор",
        partnership_type: PartnershipType.Vendor,
        status: CompanyStatus.Accept,
      };
      const { service, mocks } = makeService({
        companyRepository: {
          findById: jest.fn().mockResolvedValue(vendorCompany),
        },
        companyEmployeeRepository: {
          findOne: jest.fn().mockResolvedValue({
            company_id: vendorCompany.id,
            company: vendorCompany,
          }),
        },
      });

      await expect(
        service.update(
          1,
          makeUser(2, [RoleTypes.SalesManager]),
          participantPatch as any,
        ),
      ).rejects.toMatchObject({ status: 403 });

      expect(
        mocks.dealRepository.updateDealAndCustomerSnapshot,
      ).not.toHaveBeenCalled();
    },
  );

  it("не позволяет рассинхронизировать реквизиты и canonical id интегратора", async () => {
    const integratorCompany = {
      id: 10,
      owner_id: 1,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
    };
    const { service } = makeService({
      companyRepository: {
        findById: jest.fn().mockResolvedValue(integratorCompany),
      },
    });

    await expect(
      service.update(1, makeUser(2, [RoleTypes.CompanyAdmin]), {
        integrator_company_id: integratorCompany.id,
        integrator_name: "Подменённое название",
        integrator_inn: integratorCompany.inn,
      } as any),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("не позволяет изменить интегратора в зарегистрированной сделке", async () => {
    const replacementIntegrator = {
      id: 11,
      owner_id: 3,
      name: "Другой интегратор",
      inn: "7700000011",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
    };
    const { service, mocks } = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          creator_id: 2,
          creator_company_id: 10,
          integrator_company_id: 10,
          integrator_name: "Интегратор",
          integrator_inn: "7700000000",
          status: DealStatus.Registered,
        }),
      },
      companyRepository: {
        findById: jest.fn().mockResolvedValue(replacementIntegrator),
      },
    });

    await expect(
      service.update(1, makeUser(8, [RoleTypes.SuperAdmin]), {
        integrator_company_id: replacementIntegrator.id,
      } as any),
    ).rejects.toMatchObject({ status: 409 });

    expect(
      mocks.dealRepository.updateDealAndCustomerSnapshot,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ["membership отсутствует", null],
    [
      "пользователь перешёл в другую компанию",
      {
        id: 11,
        partnership_type: PartnershipType.Integrator,
        status: CompanyStatus.Accept,
      },
    ],
  ])("запрещает creator update, когда %s", async (_case, currentCompany) => {
    const { service, mocks } = makeService();
    mocks.companyRepository.findUniqueAcceptedByUserId.mockResolvedValue(
      currentCompany,
    );

    await expect(
      service.update(1, makeUser(2, [RoleTypes.CompanyAdmin]), {
        deal_sum: 2000,
      } as any),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      mocks.dealRepository.updateDealAndCustomerSnapshot,
    ).not.toHaveBeenCalled();
  });

  it("запрещает creator update при неоднозначном accepted membership", async () => {
    const { service, mocks } = makeService();
    // Repository returns null for both no company and more than one accepted
    // company; either state must fail closed against the immutable snapshot.
    mocks.companyRepository.findUniqueAcceptedByUserId.mockResolvedValue(null);

    await expect(
      service.update(1, makeUser(2, [RoleTypes.CompanyAdmin]), {
        comment: "Нельзя применить",
      } as any),
    ).rejects.toMatchObject({ status: 403 });
  });
});
