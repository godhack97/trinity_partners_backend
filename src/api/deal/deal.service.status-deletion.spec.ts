import { DealService } from "./deal.service";
import {
  DealDuplicateReviewStatus,
  DealStatus,
} from "@orm/entities";
import { DealDeletionStatus } from "@orm/entities/deal-deletion-request.entity";

describe("DealService status state machine and deletion orchestration", () => {
  const registrationDeadline = new Date("2099-12-31T23:59:59.000Z");
  const superAdmin = {
    id: 1,
    email: "admin@example.test",
    role: { name: "super_admin" },
    roles: [],
  } as any;
  const partnerManager = {
    id: 7,
    email: "manager@example.test",
    role: { name: "employee" },
    roles: [{ name: "partner_manager" }],
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
    [DealStatus.Registered, DealStatus.Moderation],
    [DealStatus.Canceled, DealStatus.Moderation],
    [DealStatus.Win, DealStatus.Registered],
    [DealStatus.Lose, DealStatus.Registered],
  ])("allows %s -> %s using a compare-and-set update", async (from, next) => {
    const deps = prepareStatusUpdate(from);

    await deps.service.updateDealStatus(
      81,
      next,
      superAdmin,
      next === DealStatus.Registered ? registrationDeadline : undefined,
    );

    expect(deps.dealRepository.update).toHaveBeenCalledWith(
      { id: 81, status: from },
      {
        status: next,
        ...(next === DealStatus.Registered
          ? { registration_expires_at: registrationDeadline }
          : {}),
      },
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

  it("allows moderation -> registered regardless of historical duplicate metadata", async () => {
    const deps = prepareStatusUpdate(DealStatus.Moderation, {
      duplicateReviewStatus: DealDuplicateReviewStatus.Pending,
    });

    await expect(
      deps.service.updateDealStatus(
        81,
        DealStatus.Registered,
        superAdmin,
        registrationDeadline,
      ),
    ).resolves.toBeDefined();
    expect(deps.dealRepository.update).toHaveBeenCalled();
  });

  it("does not resend approval notification when moving win back to registered", async () => {
    const deps = prepareStatusUpdate(DealStatus.Win);

    await deps.service.updateDealStatus(
      81,
      DealStatus.Registered,
      superAdmin,
      registrationDeadline,
    );

    expect(
      deps.service.notifyDistributorAboutApprovedDeal,
    ).not.toHaveBeenCalled();
  });

  it("allows the responsible manager to move a registered deal back", async () => {
    const deps = prepareStatusUpdate(DealStatus.Registered);
    (deps.deal as any).responsible_manager_id = partnerManager.id;

    await deps.service.updateDealStatus(
      81,
      DealStatus.Moderation,
      partnerManager,
    );

    expect(deps.dealRepository.update).toHaveBeenCalledWith(
      { id: 81, status: DealStatus.Registered },
      { status: DealStatus.Moderation },
    );
  });

  it("reports a status CAS miss as conflict and skips side effects", async () => {
    const deps = prepareStatusUpdate(DealStatus.Moderation, { affected: 0 });

    await expect(
      deps.service.updateDealStatus(
        81,
        DealStatus.Registered,
        superAdmin,
        registrationDeadline,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect((deps.service as any).notifyDealStatusChanged).not.toHaveBeenCalled();
    expect(deps.service.notifyDistributorAboutApprovedDeal).not.toHaveBeenCalled();
  });

  it("requires a future deadline when registering a deal", async () => {
    const deps = prepareStatusUpdate(DealStatus.Moderation);

    await expect(
      deps.service.updateDealStatus(81, DealStatus.Registered, superAdmin),
    ).rejects.toMatchObject({
      status: 400,
      message: "Укажите срок регистрации сделки",
    });
    await expect(
      deps.service.updateDealStatus(
        81,
        DealStatus.Registered,
        superAdmin,
        new Date("2020-01-01T00:00:00.000Z"),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("automatically cancels an expired registered deal once", async () => {
    const expiredAt = new Date("2026-08-26T12:00:00.000Z");
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 82,
          creator_id: 17,
          deal_num: "D-82",
          status: DealStatus.Registered,
          registration_expires_at: expiredAt,
          bitrix24_deal_id: null,
        },
      ]),
    };
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const deps = makeService({
      dealRepository: {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        update,
      },
    });
    (deps.service as any).syncExpiredDealStatusWithBitrix = jest.fn();
    (deps.service as any).notifyDealRegistrationExpired = jest
      .fn()
      .mockResolvedValue(undefined);

    await deps.service.expireDealRegistrations();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 82,
        status: DealStatus.Registered,
        registration_expires_at: expect.anything(),
      }),
      { status: DealStatus.Canceled },
    );
    expect(
      (deps.service as any).notifyDealRegistrationExpired,
    ).toHaveBeenCalledTimes(1);
    expect(
      (deps.service as any).syncExpiredDealStatusWithBitrix,
    ).toHaveBeenCalledWith(expect.objectContaining({
      id: 82,
      status: DealStatus.Canceled,
    }));
  });

  it("does not cancel a registration extended during expiration processing", async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 83,
          status: DealStatus.Registered,
          registration_expires_at: new Date("2026-08-26T12:00:00.000Z"),
        },
      ]),
    };
    const deps = makeService({
      dealRepository: {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        update: jest.fn().mockResolvedValue({ affected: 0 }),
      },
    });
    (deps.service as any).syncExpiredDealStatusWithBitrix = jest.fn();
    (deps.service as any).notifyDealRegistrationExpired = jest.fn();

    await deps.service.expireDealRegistrations();

    expect(
      (deps.service as any).syncExpiredDealStatusWithBitrix,
    ).not.toHaveBeenCalled();
    expect(
      (deps.service as any).notifyDealRegistrationExpired,
    ).not.toHaveBeenCalled();
  });

  it("deletes a deal regardless of historical duplicate references", async () => {
    const deps = makeService({
      dealRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 91,
          customer: { inn_normalized: "7707083893" },
        }),
        softDeleteWithDuplicateGuard: jest.fn().mockResolvedValue(true),
      },
    });

    await expect(deps.service.remove(91, superAdmin)).resolves.toBeUndefined();
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
