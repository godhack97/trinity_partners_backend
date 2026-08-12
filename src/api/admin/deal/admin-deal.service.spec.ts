import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import {
  DealDuplicateReviewStatus,
  DealStatus,
} from "@orm/entities";
import { AdminDealService } from "./admin-deal.service";

describe("AdminDealService", () => {
  const dealRepository = {
    findById: jest.fn(),
    findDuplicateCandidatesByNormalizedInn: jest.fn(),
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
    duplicate_of_deal_id: 3,
    duplicate_review_status: DealDuplicateReviewStatus.Pending,
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
    dealRepository.findDuplicateCandidatesByNormalizedInn.mockResolvedValue([]);
    dealService.notifyDistributorAboutApprovedDeal.mockResolvedValue(undefined);
    dealService.findOne.mockResolvedValue(deal);
  });

  it("notifies the distributor when moderation is approved", async () => {
    dealRepository.findById
      .mockResolvedValueOnce({
        ...deal,
        status: DealStatus.Moderation,
        duplicate_review_status: null,
      })
      .mockResolvedValueOnce({ ...deal, status: DealStatus.Registered });

    await service.update(7, { status: DealStatus.Registered }, superAdmin);

    expect(dealService.notifyDistributorAboutApprovedDeal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, status: DealStatus.Registered }),
    );
  });

  it("preserves special terms when only the status changes", async () => {
    dealRepository.findById.mockResolvedValueOnce({
      ...deal,
      duplicate_review_status: null,
    });
    await service.update(7, { status: DealStatus.Registered }, superAdmin);

    expect(dealRepository.update).toHaveBeenCalledWith(
      { id: 7, status: DealStatus.Moderation },
      { status: DealStatus.Registered },
    );
  });

  it("calculates special price from a percentage discount", async () => {
    dealRepository.findById.mockResolvedValueOnce({
      ...deal,
      duplicate_review_status: null,
    });
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
    dealRepository.findById.mockResolvedValueOnce({
      ...deal,
      duplicate_review_status: null,
    });
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
    dealRepository.findById.mockResolvedValueOnce({
      ...deal,
      duplicate_review_status: null,
    });
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

  it("blocks approval until a pending INN duplicate review is resolved", async () => {
    await expect(
      service.update(7, { status: DealStatus.Registered }, superAdmin),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dealRepository.update).not.toHaveBeenCalled();
  });

  it("rejects status jumps outside the deal state machine", async () => {
    dealRepository.findById.mockResolvedValueOnce({
      ...deal,
      duplicate_review_status: null,
    });

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

  it("atomically saves reviewer metadata and notifies the creator", async () => {
    await service.reviewDuplicate(
      7,
      {
        status: DealDuplicateReviewStatus.NotDuplicate,
        comment: "  Проверено вручную  ",
      },
      superAdmin,
    );

    expect(dealRepository.update).toHaveBeenCalledWith(
      {
        id: 7,
        duplicate_of_deal_id: 3,
        duplicate_review_status: DealDuplicateReviewStatus.Pending,
      },
      {
        duplicate_review_status: DealDuplicateReviewStatus.NotDuplicate,
        duplicate_reviewed_by_user_id: superAdmin.id,
        duplicate_reviewed_at: expect.any(Date),
        duplicate_review_comment: "Проверено вручную",
      },
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 12 }),
    );
  });

  it("allows only the assigned partner manager and includes assignment in CAS", async () => {
    const assignedManager = {
      id: 22,
      role: { name: "partner_manager" },
      roles: [],
    } as any;

    await service.reviewDuplicate(
      7,
      { status: DealDuplicateReviewStatus.Duplicate },
      assignedManager,
    );

    expect(dealRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        duplicate_review_status: DealDuplicateReviewStatus.Pending,
        responsible_manager_id: assignedManager.id,
      }),
      expect.objectContaining({
        duplicate_review_status: DealDuplicateReviewStatus.Duplicate,
        duplicate_reviewed_by_user_id: assignedManager.id,
        duplicate_review_comment: null,
      }),
    );
  });

  it("rejects a partner manager who is not assigned to the deal snapshot", async () => {
    const foreignManager = {
      id: 23,
      role: { name: "partner_manager" },
      roles: [],
    } as any;

    await expect(
      service.reviewDuplicate(
        7,
        { status: DealDuplicateReviewStatus.Duplicate },
        foreignManager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(dealRepository.update).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("requires a duplicate pointer", async () => {
    dealRepository.findById.mockResolvedValueOnce({
      ...deal,
      duplicate_of_deal_id: null,
    });

    await expect(
      service.reviewDuplicate(
        7,
        { status: DealDuplicateReviewStatus.NotDuplicate },
        superAdmin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dealRepository.update).not.toHaveBeenCalled();
  });

  it("rejects repeated or final duplicate-review transitions", async () => {
    dealRepository.findById.mockResolvedValueOnce({
      ...deal,
      duplicate_review_status: DealDuplicateReviewStatus.Duplicate,
    });

    await expect(
      service.reviewDuplicate(
        7,
        { status: DealDuplicateReviewStatus.NotDuplicate },
        superAdmin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dealRepository.update).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("rejects a concurrent final transition and does not notify", async () => {
    dealRepository.update.mockResolvedValueOnce({ affected: 0 });

    await expect(
      service.reviewDuplicate(
        7,
        { status: DealDuplicateReviewStatus.Duplicate },
        superAdmin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it("keeps a committed review successful when notification delivery fails", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    notificationService.send.mockRejectedValueOnce(new Error("queue offline"));

    await expect(
      service.reviewDuplicate(
        7,
        { status: DealDuplicateReviewStatus.NotDuplicate },
        superAdmin,
      ),
    ).resolves.toMatchObject({ success: true });
    expect(dealRepository.update).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it("returns a redacted comparison cluster to the assigned reviewer", async () => {
    const current = {
      ...deal,
      customer: {
        inn: "7707083893",
        inn_normalized: "7707083893",
        company_name: "Заказчик",
        email: "must-not-leak@example.test",
      },
      distributor_company: { id: 4, name: "Дистрибьютор" },
    };
    const canonical = {
      ...deal,
      id: 3,
      deal_num: "D-3",
      customer: {
        inn: "7707083893",
        inn_normalized: "7707083893",
        company_name: "Заказчик",
        phone: "+79999999999",
      },
    };
    dealRepository.findById
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(canonical);
    dealRepository.findDuplicateCandidatesByNormalizedInn.mockResolvedValue([
      canonical,
      current,
    ]);

    const result = await service.getDuplicateReviewContext(7, superAdmin);

    expect(
      dealRepository.findDuplicateCandidatesByNormalizedInn,
    ).toHaveBeenCalledWith("7707083893");
    expect(result).toMatchObject({
      current: { id: 7, customer_inn: "7707083893" },
      canonical: { id: 3, deal_num: "D-3" },
      match_count: 2,
    });
    expect(result.current).not.toHaveProperty("email");
    expect(result.canonical).not.toHaveProperty("phone");
  });
});
