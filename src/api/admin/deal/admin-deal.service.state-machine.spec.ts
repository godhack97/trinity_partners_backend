import {
  BadRequestException,
} from "@nestjs/common";
import {
  DealDuplicateReviewStatus,
  DealStatus,
} from "@orm/entities";
import { AdminDealService } from "./admin-deal.service";

describe("AdminDealService status state machine", () => {
  const superAdmin = {
    id: 1,
    role: { name: "super_admin" },
    roles: [],
  } as any;

  const makeService = (
    from: DealStatus,
    options: {
      duplicateReviewStatus?: DealDuplicateReviewStatus | null;
      affected?: number;
      persistedStatus?: DealStatus;
    } = {},
  ) => {
    const deal = {
      id: 71,
      creator_id: 14,
      deal_num: "D-71",
      deal_sum: 1000,
      status: from,
      duplicate_review_status: options.duplicateReviewStatus ?? null,
      special_discount: null,
      special_price: null,
      discount_date: null,
    };
    const dealRepository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(deal)
        .mockResolvedValue({
          ...deal,
          status: options.persistedStatus ?? from,
        }),
      update: jest.fn().mockResolvedValue({
        affected: options.affected ?? 1,
      }),
    };
    const notificationService = { send: jest.fn().mockResolvedValue(undefined) };
    const dealService = {
      findOne: jest.fn(),
      notifyDistributorAboutApprovedDeal: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminDealService(
      dealRepository as any,
      notificationService as any,
      dealService as any,
    );

    return { service, dealRepository, notificationService, dealService };
  };

  it.each([
    [DealStatus.Moderation, DealStatus.Registered],
    [DealStatus.Moderation, DealStatus.Canceled],
    [DealStatus.Registered, DealStatus.Win],
    [DealStatus.Registered, DealStatus.Lose],
  ])("allows %s -> %s using a compare-and-set update", async (from, next) => {
    const deps = makeService(from, { persistedStatus: next });

    await expect(
      deps.service.update(71, { status: next }, superAdmin),
    ).resolves.toMatchObject({ success: true });

    expect(deps.dealRepository.update).toHaveBeenCalledWith(
      { id: 71, status: from },
      { status: next },
    );
  });

  it.each([
    [DealStatus.Moderation, DealStatus.Win],
    [DealStatus.Registered, DealStatus.Canceled],
    [DealStatus.Canceled, DealStatus.Registered],
    [DealStatus.Win, DealStatus.Lose],
  ])("rejects invalid transition %s -> %s", async (from, next) => {
    const deps = makeService(from);

    await expect(
      deps.service.update(71, { status: next }, superAdmin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(deps.dealRepository.update).not.toHaveBeenCalled();
  });

  it("allows moderation -> registered regardless of historical duplicate metadata", async () => {
    const deps = makeService(DealStatus.Moderation, {
      duplicateReviewStatus: DealDuplicateReviewStatus.Pending,
    });

    await expect(
      deps.service.update(
        71,
        { status: DealStatus.Registered },
        superAdmin,
      ),
    ).resolves.toEqual(expect.objectContaining({ success: true }));
    expect(deps.dealRepository.update).toHaveBeenCalled();
  });

  it("reports a CAS miss as conflict and emits no notifications", async () => {
    const deps = makeService(DealStatus.Moderation, {
      affected: 0,
      persistedStatus: DealStatus.Registered,
    });

    await expect(
      deps.service.update(
        71,
        { status: DealStatus.Registered },
        superAdmin,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(deps.notificationService.send).not.toHaveBeenCalled();
    expect(
      deps.dealService.notifyDistributorAboutApprovedDeal,
    ).not.toHaveBeenCalled();
  });

  it("allows same-status commercial-term updates without another status notification", async () => {
    const deps = makeService(DealStatus.Registered, {
      persistedStatus: DealStatus.Registered,
    });

    await deps.service.update(
      71,
      { status: DealStatus.Registered, special_price: 900 },
      superAdmin,
    );

    expect(deps.notificationService.send).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Статус сделки" }),
    );
    expect(deps.notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Выдана скидка" }),
    );
    expect(
      deps.dealService.notifyDistributorAboutApprovedDeal,
    ).not.toHaveBeenCalled();
  });
});
