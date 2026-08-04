import { DealService } from "./deal.service";
import { DealStatus, PartnershipType } from "@orm/entities";

describe("DealService draft submission", () => {
  const makeService = () => {
    const distributorRepository = {
      findById: jest.fn(),
    };
    const customerRepository = {
      findSimilar: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    const dealRepository = {
      countDealsForToday: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    };
    const companyRepository = {
      findByOwnerId: jest.fn(),
      findById: jest.fn(),
    };
    const bitrix24Service = {
      findOrCreateIntegratorContact: jest.fn(),
    };
    const userRepository = {};
    const emailConfirmerService = {};
    const dealDeletionRequestRepository = {};
    const companyEmployeeRepository = { findOne: jest.fn() };
    const configuratorDraftRepository = {};
    const configService = { get: jest.fn() };
    const notificationService = {};

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
      bitrix24Service,
    };
  };

  it("creates a draft without touching Bitrix24", async () => {
    const deps = makeService();
    const company = {
      id: 10,
      name: "Интегратор",
      inn: "7700000000",
      partnership_type: PartnershipType.Integrator,
    };
    const distributor = { id: 20, name: "Дистрибьютор" };
    const customer = {
      id: 30,
      company_name: "Заказчик",
      inn: "7800000000",
    };

    deps.companyRepository.findByOwnerId.mockResolvedValue(company);
    deps.distributorRepository.findById.mockResolvedValue(distributor);
    deps.customerRepository.findSimilar.mockResolvedValue(customer);
    deps.dealRepository.countDealsForToday.mockResolvedValue(0);
    deps.dealRepository.save.mockImplementation(async (value) => ({
      id: 40,
      ...value,
    }));
    jest
      .spyOn(deps.service as any, "findExistingDealByCustomerInn")
      .mockResolvedValue(null);

    const result = await deps.service.create(
      { id: 7 } as any,
      {
        distributor_id: distributor.id,
        customer: customer as any,
        deal_sum: 1000,
        purchase_date: new Date("2026-09-01"),
      } as any,
    );

    expect(result.status).toBe(DealStatus.Draft);
    expect(deps.bitrix24Service.findOrCreateIntegratorContact).not.toHaveBeenCalled();
  });

  it("sends a draft only through the explicit submit operation", async () => {
    const deps = makeService();
    const creator = { id: 7 } as any;
    const deal = {
      id: 40,
      creator_id: creator.id,
      status: DealStatus.Draft,
      customer_id: 30,
      customer: { id: 30 },
      distributor_id: 20,
      distributor: { id: 20, name: "Дистрибьютор" },
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
    jest
      .spyOn(deps.service as any, "notifyManagerAboutDuplicateCustomerInn")
      .mockResolvedValue(undefined);
    deps.bitrix24Service.findOrCreateIntegratorContact.mockResolvedValue(55);
    deps.dealRepository.update.mockResolvedValue({ affected: 1 });

    await deps.service.submit(deal.id, creator);

    expect(deps.dealRepository.update).toHaveBeenCalledWith(
      deal.id,
      expect.objectContaining({
        status: DealStatus.Moderation,
        bitrix24_integrator_contact_id: 55,
      }),
    );
    expect((deps.service as any).sendLeadToBitrix24).toHaveBeenCalledTimes(1);
  });
});
