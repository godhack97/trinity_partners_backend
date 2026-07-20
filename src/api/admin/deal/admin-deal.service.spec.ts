import { BadRequestException } from "@nestjs/common";
import {
  DealDuplicateReviewStatus,
  DealStatus,
} from "@orm/entities";
import { AdminDealService } from "./admin-deal.service";

describe("AdminDealService", () => {
  const dealRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const notificationService = { send: jest.fn() };
  const service = new AdminDealService(
    dealRepository as any,
    notificationService as any,
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
    duplicate_of_deal_id: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dealRepository.findById.mockResolvedValue(deal);
    dealRepository.update.mockResolvedValue({ affected: 1 });
    notificationService.send.mockResolvedValue(undefined);
  });

  it("preserves special terms when only the status changes", async () => {
    await service.update(7, { status: DealStatus.Registered });

    expect(dealRepository.update).toHaveBeenCalledWith(7, {
      status: DealStatus.Registered,
    });
  });

  it("calculates special price from a percentage discount", async () => {
    const discountDate = new Date("2027-01-31T00:00:00.000Z");

    await service.update(7, {
      status: DealStatus.Registered,
      special_discount: "12.5%",
      special_price: 875,
      discount_date: discountDate,
    });

    expect(dealRepository.update).toHaveBeenCalledWith(7, {
      status: DealStatus.Registered,
      special_discount: "12.5%",
      special_price: 875,
      discount_date: discountDate,
    });
  });

  it("supports an explicit special price without a discount", async () => {
    await service.update(7, {
      status: DealStatus.Registered,
      special_price: 820.5,
    });

    expect(dealRepository.update).toHaveBeenCalledWith(7, {
      status: DealStatus.Registered,
      special_discount: null,
      special_price: 820.5,
      discount_date: null,
    });
  });

  it("rejects conflicting discount and price values", async () => {
    await expect(
      service.update(7, {
        status: DealStatus.Registered,
        special_discount: "10%",
        special_price: 700,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dealRepository.update).not.toHaveBeenCalled();
  });

  it("saves a final duplicate review status and notifies the creator", async () => {
    await service.reviewDuplicate(7, DealDuplicateReviewStatus.NotDuplicate);

    expect(dealRepository.update).toHaveBeenCalledWith(7, {
      duplicate_review_status: DealDuplicateReviewStatus.NotDuplicate,
    });
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 12 }),
    );
  });
});
