import { DealService } from "./deal.service";
import {
  CompanyStatus,
  DealStatus,
  PartnershipType,
} from "@orm/entities";
import { RoleTypes } from "@app/types/RoleTypes";

describe("DealService draft submission", () => {
  const makeService = () => {
    const distributorRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
    };
    const customerRepository = {
      findSimilar: jest.fn(),
      findByNormalizedInn: jest.fn(),
      findById: jest.fn(),
      save: jest
        .fn()
        .mockImplementation(async (value) => ({ id: 30, ...value })),
    };
    const dealRepository = {
      countDealsForToday: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      updateDealAndCustomerSnapshot: jest
        .fn()
        .mockResolvedValue({ customerId: 30 }),
      hasPendingDuplicateReferences: jest.fn().mockResolvedValue(false),
      findById: jest.fn(),
      claimBitrix24Sync: jest.fn(),
      finishBitrix24Sync: jest.fn().mockResolvedValue(true),
      submitDraft: jest.fn().mockResolvedValue(true),
    };
    const companyRepository = {
      findByOwnerId: jest.fn(),
      findUniqueAcceptedByUserId: jest.fn(),
      findById: jest.fn(),
      findAcceptedDistributorByName: jest.fn().mockResolvedValue(null),
      findAcceptedIntegratorByInn: jest.fn().mockResolvedValue(null),
    };
    const bitrix24Service = {
      findOrCreateIntegratorContact: jest.fn(),
      createContact: jest.fn(),
      createLead: jest.fn(),
      updateLead: jest.fn(),
    };
    const userRepository = {
      findByIdWithUserInfo: jest.fn(),
      findByIdWithPermissions: jest.fn().mockResolvedValue({
        id: 55,
        is_activated: true,
        role: { name: RoleTypes.PartnerManager },
        roles: [],
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const emailConfirmerService = {};
    const dealDeletionRequestRepository = {};
    const companyEmployeeRepository = { findOne: jest.fn() };
    companyRepository.findUniqueAcceptedByUserId.mockImplementation(
      async (userId: number) =>
        (await companyRepository.findByOwnerId(userId)) ||
        (await companyEmployeeRepository.findOne({
          where: {
            employee_id: userId,
            status: "accept",
          },
        }))?.company ||
        null,
    );
    const configuratorDraftRepository = {};
    const configService = { get: jest.fn() };
    const notificationService = { send: jest.fn() };

    const service = new DealService(
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
    );

    return {
      service,
      distributorRepository,
      customerRepository,
      dealRepository,
      companyRepository,
      companyEmployeeRepository,
      bitrix24Service,
      userRepository,
      notificationService,
    };
  };

  it("does not let the submit fire-and-forget path bypass another sync lease", async () => {
    const deps = makeService();
    deps.dealRepository.claimBitrix24Sync.mockResolvedValue(null);

    await expect(
      (deps.service as any).sendLeadToBitrix24(
        { id: 41, creator_id: 7 },
        { id: 30 },
      ),
    ).resolves.toBe(false);

    expect(deps.dealRepository.claimBitrix24Sync).toHaveBeenCalledWith(
      41,
      false,
    );
    expect(deps.bitrix24Service.createLead).not.toHaveBeenCalled();
    expect(deps.bitrix24Service.updateLead).not.toHaveBeenCalled();
  });

  it("persists and reuses the creator contact across sequential deal syncs", async () => {
    const deps = makeService();
    const creator = { id: 7, email: "creator@example.test" } as any;
    const customer = { id: 30 };
    const firstDeal = {
      id: 41,
      creator_id: creator.id,
      partner: creator,
      customer,
    };
    const secondDeal = {
      id: 42,
      creator_id: creator.id,
      partner: creator,
      customer,
    };
    deps.dealRepository.claimBitrix24Sync
      .mockResolvedValueOnce({ deal: firstDeal, token: "lease-41" })
      .mockResolvedValueOnce({ deal: secondDeal, token: "lease-42" });
    deps.bitrix24Service.createContact.mockResolvedValue(90);
    deps.bitrix24Service.createLead.mockResolvedValue(777);

    await expect(
      (deps.service as any).sendLeadToBitrix24(
        firstDeal,
        customer,
        undefined,
        creator,
      ),
    ).resolves.toBe(true);
    await expect(
      (deps.service as any).sendLeadToBitrix24(
        secondDeal,
        customer,
        undefined,
        creator,
      ),
    ).resolves.toBe(true);

    expect(deps.bitrix24Service.createContact).toHaveBeenCalledTimes(1);
    expect(deps.userRepository.update).toHaveBeenCalledWith(creator.id, {
      bitrix24_contact_id: 90,
    });
    expect(deps.bitrix24Service.createLead).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: firstDeal.id }),
      customer,
      expect.any(String),
      90,
    );
    expect(deps.bitrix24Service.createLead).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: secondDeal.id }),
      customer,
      expect.any(String),
      90,
    );
  });

  it("force-syncs a linked lead through the lease and update path", async () => {
    const deps = makeService();
    const creator = { id: 7, bitrix24_contact_id: 90 };
    const customer = { id: 30 };
    const distributor = { id: 3, name: "Distributor" };
    const linkedDeal = {
      id: 41,
      creator_id: creator.id,
      customer_id: customer.id,
      distributor_id: distributor.id,
      bitrix24_deal_id: 777,
      status: DealStatus.Moderation,
      partner: creator,
      customer,
      distributor,
    };
    jest.spyOn(deps.service, "findOne").mockResolvedValue(linkedDeal as any);
    deps.customerRepository.findById.mockResolvedValue(customer);
    deps.distributorRepository.findById.mockResolvedValue(distributor);
    deps.userRepository.findByIdWithUserInfo.mockResolvedValue(creator);
    deps.dealRepository.claimBitrix24Sync.mockResolvedValue({
      deal: linkedDeal,
      token: "lease-41",
    });
    deps.bitrix24Service.updateLead.mockResolvedValue(true);

    await expect(
      deps.service.forceSendToBitrix24(41, { id: 7 } as any),
    ).resolves.toEqual({
      success: true,
      message: "Лид отправлен в Bitrix24",
    });

    expect(deps.dealRepository.claimBitrix24Sync).toHaveBeenCalledWith(
      41,
      true,
    );
    expect(deps.bitrix24Service.updateLead).toHaveBeenCalledWith(
      777,
      linkedDeal,
      "Distributor",
      90,
    );
    expect(deps.bitrix24Service.createLead).not.toHaveBeenCalled();
    expect(deps.dealRepository.finishBitrix24Sync).toHaveBeenCalledWith(
      expect.objectContaining({ token: "lease-41" }),
      { success: true, bitrix24LeadId: 777 },
    );
  });

  it("creates a draft without touching Bitrix24", async () => {
    const deps = makeService();
    const company = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };
    const distributor = { id: 20, name: "Дистрибьютор" };
    const distributorCompany = {
      id: 21,
      name: distributor.name,
      inn: "7800000001",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    };
    const customer = {
      id: 30,
      company_name: "Заказчик",
      inn: "7707083893",
      inn_normalized: "7707083893",
    };

    deps.companyRepository.findByOwnerId.mockResolvedValue(company);
    deps.companyRepository.findById.mockResolvedValue(distributorCompany);
    deps.distributorRepository.findById.mockResolvedValue(distributor);
    deps.dealRepository.countDealsForToday.mockResolvedValue(0);
    deps.dealRepository.save.mockImplementation(async (value) => ({
      id: 40,
      ...value,
    }));

    const result = await deps.service.create(
      { id: 7 } as any,
      {
        distributor_id: distributor.id,
        distributor_company_id: distributorCompany.id,
        customer: customer as any,
        deal_sum: 1000,
        purchase_date: new Date("2026-09-01"),
      } as any,
    );

    expect(result.status).toBe(DealStatus.Draft);
    expect(deps.bitrix24Service.findOrCreateIntegratorContact).not.toHaveBeenCalled();
  });

  it("requires an accepted canonical integrator for a distributor deal", async () => {
    const deps = makeService();
    const distributorCompany = {
      id: 21,
      name: "Дистрибьютор",
      inn: "7800000001",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };

    deps.companyRepository.findByOwnerId.mockResolvedValue(distributorCompany);
    deps.distributorRepository.findByName.mockResolvedValue(null);
    deps.companyRepository.findAcceptedIntegratorByInn.mockResolvedValue(null);

    await expect(
      deps.service.create(
        { id: 7 } as any,
        {
          integrator_name: "Несуществующий интегратор",
          integrator_inn: "7700000099",
          customer: { inn: "7800000000" },
          deal_sum: 1000,
          purchase_date: new Date("2026-09-01"),
        } as any,
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(deps.customerRepository.save).not.toHaveBeenCalled();
    expect(deps.dealRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    ["pending", CompanyStatus.Pending, PartnershipType.Integrator],
    ["wrong type", CompanyStatus.Accept, PartnershipType.Distributor],
  ])(
    "rejects a %s company selected as integrator",
    async (_caseName, status, partnershipType) => {
      const deps = makeService();
      const distributorCompany = {
        id: 21,
        name: "Дистрибьютор",
        inn: "7800000001",
        partnership_type: PartnershipType.Distributor,
        status: CompanyStatus.Accept,
      };
      const invalidIntegratorCompany = {
        id: 10,
        name: "Интегратор",
        inn: "7700000000",
        partnership_type: partnershipType,
        status,
      };

      deps.companyRepository.findByOwnerId.mockResolvedValue(distributorCompany);
      deps.companyRepository.findById.mockResolvedValue(invalidIntegratorCompany);
      deps.distributorRepository.findByName.mockResolvedValue(null);

      await expect(
        deps.service.create(
          { id: 7 } as any,
          {
            integrator_company_id: invalidIntegratorCompany.id,
            customer: { inn: "7800000000" },
            deal_sum: 1000,
            purchase_date: new Date("2026-09-01"),
          } as any,
        ),
      ).rejects.toMatchObject({ status: 400 });

      expect(deps.customerRepository.save).not.toHaveBeenCalled();
      expect(deps.dealRepository.save).not.toHaveBeenCalled();
    },
  );

  it("creates a distributor deal with its own company and selected integrator", async () => {
    const deps = makeService();
    const distributorCompany = {
      id: 21,
      name: "Дистрибьютор",
      inn: "7800000001",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };
    const integratorCompany = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };
    const customer = {
      id: 30,
      company_name: "Заказчик",
      inn: "7707083893",
      inn_normalized: "7707083893",
    };

    deps.companyRepository.findByOwnerId.mockResolvedValue(distributorCompany);
    deps.companyRepository.findById.mockResolvedValue(integratorCompany);
    deps.distributorRepository.findByName.mockResolvedValue(null);
    deps.dealRepository.countDealsForToday.mockResolvedValue(0);
    deps.dealRepository.save.mockImplementation(async (value) => ({
      id: 40,
      ...value,
    }));

    const result = await deps.service.create(
      { id: 7 } as any,
      {
        integrator_company_id: integratorCompany.id,
        customer: customer as any,
        deal_sum: 1000,
        purchase_date: new Date("2026-09-01"),
      } as any,
    );

    expect(result).toMatchObject({
      distributor_company_id: distributorCompany.id,
      distributor_id: null,
      integrator_company_id: integratorCompany.id,
      integrator_name: integratorCompany.name,
      integrator_inn: integratorCompany.inn,
      responsible_manager_id: 55,
      status: DealStatus.Draft,
    });
  });

  it("lets a Trinity manager select both canonical participants", async () => {
    const deps = makeService();
    const distributorCompany = {
      id: 21,
      name: "Дистрибьютор",
      inn: "7800000001",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    };
    const integratorCompany = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };
    const customer = {
      id: 30,
      company_name: "Заказчик",
      inn: "7707083893",
      inn_normalized: "7707083893",
    };

    deps.companyRepository.findByOwnerId.mockResolvedValue(null);
    deps.companyRepository.findById.mockImplementation(async (id) =>
      id === distributorCompany.id ? distributorCompany : integratorCompany,
    );
    deps.distributorRepository.findByName.mockResolvedValue(null);
    deps.dealRepository.countDealsForToday.mockResolvedValue(0);
    deps.dealRepository.save.mockImplementation(async (value) => ({
      id: 40,
      ...value,
    }));

    const result = await deps.service.create(
      {
        id: 7,
        role: { name: RoleTypes.PartnerManager },
        roles: [],
      } as any,
      {
        distributor_company_id: distributorCompany.id,
        integrator_company_id: integratorCompany.id,
        customer: customer as any,
        deal_sum: 1000,
        purchase_date: new Date("2026-09-01"),
      } as any,
    );

    expect(result).toMatchObject({
      distributor_company_id: distributorCompany.id,
      integrator_company_id: integratorCompany.id,
      responsible_manager_id: 7,
      status: DealStatus.Draft,
    });
  });

  it("rejects a partner draft before writing customer data when its company has no responsible manager", async () => {
    const deps = makeService();
    const integrator = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
      responsible_manager_id: null,
    };
    const distributorCompany = {
      id: 21,
      name: "Дистрибьютор",
      inn: "7800000001",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    };
    deps.companyRepository.findByOwnerId.mockResolvedValue(integrator);
    deps.companyRepository.findById.mockResolvedValue(distributorCompany);
    deps.distributorRepository.findByName.mockResolvedValue(null);

    await expect(
      deps.service.create(
        { id: 7 } as any,
        {
          distributor_company_id: distributorCompany.id,
          customer: { inn: "7707083893" },
          deal_sum: 1000,
          purchase_date: new Date("2026-09-01"),
        } as any,
      ),
    ).rejects.toMatchObject({ status: 409 });

    expect(deps.customerRepository.save).not.toHaveBeenCalled();
    expect(deps.dealRepository.save).not.toHaveBeenCalled();
  });

  it("rejects a partner draft assigned to an inactive responsible manager", async () => {
    const deps = makeService();
    const integrator = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };
    const distributorCompany = {
      id: 21,
      name: "Дистрибьютор",
      inn: "7800000001",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    };
    deps.companyRepository.findByOwnerId.mockResolvedValue(integrator);
    deps.companyRepository.findById.mockResolvedValue(distributorCompany);
    deps.distributorRepository.findByName.mockResolvedValue(null);
    deps.userRepository.findByIdWithPermissions.mockResolvedValue({
      id: 55,
      is_activated: false,
      role: { name: RoleTypes.PartnerManager },
      roles: [],
    });

    await expect(
      deps.service.create(
        { id: 7 } as any,
        {
          distributor_company_id: distributorCompany.id,
          customer: { inn: "7707083893" },
          deal_sum: 1000,
          purchase_date: new Date("2026-09-01"),
        } as any,
      ),
    ).rejects.toMatchObject({ status: 409 });

    expect(deps.customerRepository.save).not.toHaveBeenCalled();
  });

  it("stores a separate customer snapshot even when contact data or INN matches", async () => {
    const deps = makeService();
    const integrator = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };
    const distributorCompany = {
      id: 21,
      name: "Дистрибьютор",
      inn: "7800000001",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    };
    const incomingCustomer = {
      company_name: "Новый заказчик",
      first_name: "Иван",
      last_name: "Иванов",
      email: "same@example.test",
      inn: "7707 083 893",
    };

    deps.companyRepository.findByOwnerId.mockResolvedValue(integrator);
    deps.companyRepository.findById.mockResolvedValue(distributorCompany);
    deps.distributorRepository.findByName.mockResolvedValue(null);
    deps.customerRepository.findSimilar.mockResolvedValue({
      id: 99,
      ...incomingCustomer,
      inn: "500100732259",
    });
    deps.customerRepository.save.mockImplementation(async (value) => ({
      id: 30,
      ...value,
    }));
    deps.dealRepository.countDealsForToday.mockResolvedValue(0);
    deps.dealRepository.save.mockImplementation(async (value) => ({
      id: 40,
      ...value,
    }));

    await deps.service.create(
      { id: 7 } as any,
      {
        distributor_company_id: distributorCompany.id,
        customer: incomingCustomer,
        deal_sum: 1000,
        purchase_date: new Date("2026-09-01"),
      } as any,
    );

    expect(deps.customerRepository.findByNormalizedInn).not.toHaveBeenCalled();
    expect(deps.customerRepository.findSimilar).not.toHaveBeenCalled();
    expect(deps.customerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        inn: "7707083893",
        inn_normalized: "7707083893",
      }),
    );
  });

  it("rejects a partner who is not linked to an accepted company", async () => {
    const deps = makeService();
    deps.companyRepository.findByOwnerId.mockResolvedValue(null);
    deps.companyEmployeeRepository.findOne.mockResolvedValue(null);

    await expect(
      deps.service.create(
        {
          id: 7,
          role: { name: RoleTypes.Partner },
          roles: [{ name: RoleTypes.Partner }],
        } as any,
        {
          distributor_company_id: 21,
          integrator_company_id: 10,
          customer: { inn: "7707083893" },
          deal_sum: 1000,
          purchase_date: new Date("2026-09-01"),
        } as any,
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(deps.companyRepository.findById).not.toHaveBeenCalled();
    expect(deps.customerRepository.save).not.toHaveBeenCalled();
    expect(deps.dealRepository.save).not.toHaveBeenCalled();
  });

  it("creates a deal with a canonical accepted distributor company without a legacy row", async () => {
    const deps = makeService();
    const integrator = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
      status: CompanyStatus.Accept,
      responsible_manager_id: 55,
    };
    const distributorCompany = {
      id: 21,
      name: "Новый дистрибьютор",
      inn: "7800000000",
      partnership_type: PartnershipType.Distributor,
      status: CompanyStatus.Accept,
    };
    const customer = {
      id: 30,
      company_name: "Заказчик",
      inn: "7707083893",
      inn_normalized: "7707083893",
    };

    deps.companyRepository.findByOwnerId.mockResolvedValue(integrator);
    deps.companyRepository.findById.mockResolvedValue(distributorCompany);
    deps.distributorRepository.findByName.mockResolvedValue(null);
    deps.dealRepository.countDealsForToday.mockResolvedValue(0);
    deps.dealRepository.save.mockImplementation(async (value) => ({
      id: 40,
      ...value,
    }));

    const result = await deps.service.create(
      { id: 7 } as any,
      {
        distributor_company_id: distributorCompany.id,
        customer: customer as any,
        deal_sum: 1000,
        purchase_date: new Date("2026-09-01"),
      } as any,
    );

    expect(result).toMatchObject({
      distributor_company_id: distributorCompany.id,
      distributor_id: null,
      creator_company_id: integrator.id,
      integrator_company_id: integrator.id,
      status: DealStatus.Draft,
    });
  });

  it("sends a draft only through the explicit submit operation", async () => {
    const deps = makeService();
    const creator = { id: 7 } as any;
    const deal = {
      id: 40,
      creator_id: creator.id,
      status: DealStatus.Draft,
      customer_id: 30,
      customer: { id: 30, inn: "7707083893", inn_normalized: "7707083893" },
      distributor_id: 20,
      distributor: { id: 20, name: "Дистрибьютор" },
      distributor_company_id: 11,
      distributor_company: {
        id: 11,
        name: "Дистрибьютор",
        status: CompanyStatus.Accept,
        partnership_type: PartnershipType.Distributor,
      },
      integrator_company_id: 12,
      integrator_company: {
        id: 12,
        name: "Интегратор",
        inn: "7700000000",
        status: CompanyStatus.Accept,
        partnership_type: PartnershipType.Integrator,
      },
      integrator_name: "Интегратор",
      integrator_inn: "7700000000",
    } as any;

    jest.spyOn(deps.service, "findOne").mockResolvedValue(deal);
    jest
      .spyOn(deps.service as any, "getUserCompany")
      .mockResolvedValue(null);
    jest
      .spyOn(deps.service as any, "sendLeadToBitrix24")
      .mockResolvedValue(undefined);
    jest
      .spyOn(deps.service as any, "notifyAdminsAboutNewDeal")
      .mockResolvedValue(undefined);
    jest
      .spyOn(deps.service as any, "notifyCounterpartyAdminsAboutNewDeal")
      .mockResolvedValue(undefined);
    await deps.service.submit(deal.id, creator);

    expect(
      deps.dealRepository.submitDraft,
    ).toHaveBeenCalledWith(
      deal.id,
      expect.objectContaining({
        status: DealStatus.Moderation,
      }),
      expect.objectContaining({
        distributorId: 20,
        distributorCompanyId: 11,
        integratorCompanyId: 12,
        integratorName: "Интегратор",
        integratorInn: "7700000000",
      }),
    );
    expect((deps.service as any).sendLeadToBitrix24).toHaveBeenCalledTimes(1);
  });

  it("fails closed when a legacy draft has not been mapped to both companies", async () => {
    const deps = makeService();
    const creator = { id: 7 } as any;
    const deal = {
      id: 42,
      creator_id: creator.id,
      status: DealStatus.Draft,
      customer_id: 30,
      customer: {
        id: 30,
        inn: "7707083893",
        inn_normalized: "7707083893",
      },
      distributor_id: 20,
      distributor: { id: 20, name: "Legacy distributor" },
      integrator_name: "Legacy integrator",
      integrator_inn: "7700000000",
    } as any;
    jest.spyOn(deps.service, "findOne").mockResolvedValue(deal);

    await expect(deps.service.submit(deal.id, creator)).rejects.toMatchObject({
      status: 400,
    });
    expect(
      deps.dealRepository.submitDraft,
    ).not.toHaveBeenCalled();
  });
});
