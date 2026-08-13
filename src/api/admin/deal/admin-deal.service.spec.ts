import { BadRequestException } from "@nestjs/common";
import { DealStatus } from "@orm/entities";
import { AdminDealService } from "./admin-deal.service";

describe("AdminDealService", () => {
  const dealRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const notificationService = { send: jest.fn() };
  const dealService = {
    notifyDistributorAboutApprovedDeal: jest.fn(),
    findOne: jest.fn(),
  };
  const service = new AdminDealService(
    dealRepository as any,
    notificationService as any,
    dealService as any,
  );
  const deal = {
    id: 7,
    creator_id: 12,
    deal_num: "D-7",
    deal_sum: 1000,
    status: DealStatus.Moderation,
    special_discount: null,
    special_price: null,
    discount_date: null,
    responsible_manager_id: 22,
  };
  const superAdmin = {
    id: 1,
    role: { name: "super_admin" },
    roles: [],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    dealRepository.findById.mockResolvedValue(deal);
    dealRepository.update.mockResolvedValue({ affected: 1 });
    notificationService.send.mockResolvedValue(undefined);
    dealService.notifyDistributorAboutApprovedDeal.mockResolvedValue(undefined);
    dealService.findOne.mockResolvedValue(deal);
  });

  it("notifies the distributor when moderation is approved", async () => {
    dealRepository.findById
      .mockResolvedValueOnce(deal)
      .mockResolvedValueOnce({ ...deal, status: DealStatus.Registered });

    await service.update(7, { status: DealStatus.Registered }, superAdmin);

    expect(dealService.notifyDistributorAboutApprovedDeal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, status: DealStatus.Registered }),
    );
  });

  it("preserves special terms when only the status changes", async () => {
    await service.update(7, { status: DealStatus.Registered }, superAdmin);

    expect(dealRepository.update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Moderation },
      { status: DealStatus.Registered },
    );
  });

  it("calculates special price from a percentage discount", async () => {
    const discountDate = new Date("2027-01-31T00:00:00.000Z");

    await service.update(
      7,
      {
        status: DealStatus.Registered,
        special_discount: "12.5%",
        special_price: 875,
        discount_date: discountDate,
      },
      superAdmin,
    );

    expect(dealRepository.update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Moderation },
      {
        status: DealStatus.Registered,
        special_discount: "12.5%",
        special_price: 875,
        discount_date: discountDate,
      },
    );
  });

  it("supports an explicit special price without a discount", async () => {
    await service.update(
      7,
      {
        status: DealStatus.Registered,
        special_price: 820.5,
      },
      superAdmin,
    );

    expect(dealRepository.update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Moderation },
      {
        status: DealStatus.Registered,
        special_discount: null,
        special_price: 820.5,
        discount_date: null,
      },
    );
  });

  it("rejects conflicting discount and price values", async () => {
    await expect(
      service.update(
        7,
        {
          status: DealStatus.Registered,
          special_discount: "10%",
          special_price: 700,
        },
        superAdmin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dealRepository.update).not.toHaveBeenCalled();
  });

  it("rejects status jumps outside the deal state machine", async () => {
    await expect(
      service.update(7, { status: DealStatus.Win }, superAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dealRepository.update).not.toHaveBeenCalled();
  });

  it("rejects a partner manager outside the responsible-company scope", async () => {
    const foreignManager = {
      id: 44,
      role: { name: "partner_manager" },
      roles: [],
    } as any;
    dealService.findOne.mockRejectedValueOnce(
      new Error("Нет доступа к сделке этой компании"),
    );

    await expect(
      service.update(
        7,
        { status: DealStatus.Registered },
        foreignManager,
      ),
    ).rejects.toThrow("Нет доступа к сделке этой компании");
    expect(dealRepository.update).not.toHaveBeenCalled();
  });
});
