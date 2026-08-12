import { DealService } from "./deal.service";
import {
  DealDuplicateReviewStatus,
  DealStatus,
} from "@orm/entities";
import { DealDeletionStatus } from "@orm/entities/deal-deletion-request.entity";

describe("DealService status state machine and deletion orchestration", () => {
  const superAdmin = {
    id: 1,
    email: "admin@example.test",
    role: { name: "super_admin" },
    roles: [],
  } as any;

  const makeService = (overrides: Record<string, any> = {}) => {
    const dealRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findById: jest.fn(),
      softDeleteWithDuplicateGuard: jest.fn(),
      approveDeletionRequestAndSoftDelete: jest.fn(),
      ...overrides.dealRepository,
    };
    const dealDeletionRequestRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      ...overrides.dealDeletionRequestRepository,
    };
    const service = new DealService(
      {} as any,
      {} as any,
      dealRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dealDeletionRequestRepository as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue("localhost") } as any,
      { send: jest.fn() } as any,
    );

    return { service, dealRepository, dealDeletionRequestRepository };
  };

  const prepareStatusUpdate = (
    from: DealStatus,
    options: {
      duplicateReviewStatus?: DealDuplicateReviewStatus | null;
      affected?: number;
    } = {},
  ) => {
    const deps = makeService({
      dealRepository: {
        update: jest.fn().mockResolvedValue({ affected: options.affected ?? 1 }),
      },
    });
    const deal = {
      id: 81,
      creator_id: 17,
      deal_num: "D-81",
      status: from,
      duplicate_review_status: options.duplicateReviewStatus ?? null,
      bitrix24_deal_id: null,
    };
    jest.spyOn(deps.service, "findOne").mockResolvedValue(deal as any);
    (deps.service as any).notifyDealStatusChanged = jest
      .fn()
      .mockResolvedValue(undefined);
    deps.service.notifyDistributorAboutApprovedDeal = jest
      .fn()
      .mockResolvedValue(undefined);

    return { ...deps, deal };
  };

  it.each([
    [DealStatus.Moderation, DealStatus.Registered],
    [DealStatus.Moderation, DealStatus.Canceled],
    [DealStatus.Registered, DealStatus.Win],
    [DealStatus.Registered, DealStatus.Lose],
  ])("allows %s -> %s using a compare-and-set update", async (from, next) => {
    const deps = prepareStatusUpdate(from);

    await deps.service.updateDealStatus(81, next, superAdmin);

    expect(deps.dealRepository.update).toHaveBeenCalledWith(
      { id: 81, status: from },
      { status: next },
    );
    expect((deps.service as any).notifyDealStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ status: next }),
      next,
      superAdmin,
    );
  });

  it.each([
    [DealStatus.Moderation, DealStatus.Win],
    [DealStatus.Registered, DealStatus.Canceled],
    [DealStatus.Canceled, DealStatus.Registered],
    [DealStatus.Win, DealStatus.Lose],
  ])("rejects invalid transition %s -> %s", async (from, next) => {
    const deps = prepareStatusUpdate(from);

    await expect(
      deps.service.updateDealStatus(81, next, superAdmin),
    ).rejects.toMatchObject({ status: 400 });
    expect(deps.dealRepository.update).not.toHaveBeenCalled();
  });

  it("blocks moderation -> registered while duplicate review is pending", async () => {
    const deps = prepareStatusUpdate(DealStatus.Moderation, {
      duplicateReviewStatus: DealDuplicateReviewStatus.Pending,
    });

    await expect(
      deps.service.updateDealStatus(81, DealStatus.Registered, superAdmin),
    ).rejects.toMatchObject({ status: 409 });
    expect(deps.dealRepository.update).not.toHaveBeenCalled();
  });

  it("reports a status CAS miss as conflict and skips side effects", async () => {
    const deps = prepareStatusUpdate(DealStatus.Moderation, { affected: 0 });

    await expect(
      deps.service.updateDealStatus(81, DealStatus.Registered, superAdmin),
    ).rejects.toMatchObject({ status: 409 });
    expect((deps.service as any).notifyDealStatusChanged).not.toHaveBeenCalled();
    expect(deps.service.notifyDistributorAboutApprovedDeal).not.toHaveBeenCalled();
  });

  it("blocks direct deletion when the atomic repository guard finds pending references", async () => {
    const deps = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 91,
          customer: { inn_normalized: "7707083893" },
        }),
        softDeleteWithDuplicateGuard: jest.fn().mockResolvedValue(false),
      },
    });

    await expect(deps.service.remove(91, superAdmin)).rejects.toMatchObject({
      status: 409,
    });
    expect(deps.dealRepository.softDeleteWithDuplicateGuard).toHaveBeenCalledWith(
      91,
      "7707083893",
    );
  });

  it("keeps a blocked approval pending and skips result notification", async () => {
    const request = {
      id: 31,
      deal_id: 91,
      requester_id: 17,
      status: DealDeletionStatus.PENDING,
    };
    const deps = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 91,
          customer: { inn_normalized: "7707083893" },
        }),
        approveDeletionRequestAndSoftDelete: jest
          .fn()
          .mockResolvedValue("blocked"),
      },
      dealDeletionRequestRepository: {
        findById: jest.fn().mockResolvedValue(request),
      },
    });
    (deps.service as any).notifyUserAboutDeletionRequestResult = jest.fn();

    await expect(
      deps.service.processDeletionRequest(31, superAdmin, {
        status: DealDeletionStatus.APPROVED,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(deps.dealDeletionRequestRepository.update).not.toHaveBeenCalled();
    expect(
      (deps.service as any).notifyUserAboutDeletionRequestResult,
    ).not.toHaveBeenCalled();
  });

  it("delegates successful approval and deletion to one atomic repository operation", async () => {
    const request = {
      id: 31,
      deal_id: 91,
      requester_id: 17,
      status: DealDeletionStatus.PENDING,
    };
    const deps = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 91,
          customer: { inn_normalized: "7707083893" },
        }),
        approveDeletionRequestAndSoftDelete: jest
          .fn()
          .mockResolvedValue("deleted"),
      },
      dealDeletionRequestRepository: {
        findById: jest.fn().mockResolvedValue(request),
      },
    });
    (deps.service as any).notifyUserAboutDeletionRequestResult = jest
      .fn()
      .mockResolvedValue(undefined);

    await expect(
      deps.service.processDeletionRequest(31, superAdmin, {
        status: DealDeletionStatus.APPROVED,
      }),
    ).resolves.toMatchObject({ message: expect.stringContaining("одобрена") });

    expect(
      deps.dealRepository.approveDeletionRequestAndSoftDelete,
    ).toHaveBeenCalledWith(31, 91, superAdmin.id, "7707083893");
    expect(deps.dealDeletionRequestRepository.update).not.toHaveBeenCalled();
    expect(
      (deps.service as any).notifyUserAboutDeletionRequestResult,
    ).toHaveBeenCalledWith(request, DealDeletionStatus.APPROVED, superAdmin);
  });
});
