import { ConflictException, ForbiddenException } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import {
  CompanyEntity,
  CompanyLifecycleAction,
  CompanyStatus,
  CompanyStatusHistoryEntity,
} from "@orm/entities";
import { CompanyManagementService } from "./company-management.service";

const actor = (id: number, role: RoleTypes) =>
  ({ id, role: { name: role }, roles: [] }) as any;

const pendingCompany = (locked = false) =>
  ({
    id: 10,
    owner_id: 90,
    name: 'ООО "Тест"',
    status: CompanyStatus.Pending,
    review_locked_at: locked ? new Date() : null,
    responsible_manager_id: null,
    responsible_manager: null,
  }) as any;

const createTransactionHarness = () => {
  const updateBuilder: any = {};
  updateBuilder.update = jest.fn(() => updateBuilder);
  updateBuilder.set = jest.fn(() => updateBuilder);
  updateBuilder.where = jest.fn(() => updateBuilder);
  updateBuilder.execute = jest.fn().mockResolvedValue({ affected: 1 });

  const historyRepository = {
    save: jest.fn().mockImplementation(async (event) => ({ id: 44, ...event })),
  };
  const companyRepository = {
    createQueryBuilder: jest.fn(() => updateBuilder),
  };
  const entityManager = {
    getRepository: jest.fn((entity) => {
      if (entity === CompanyEntity) return companyRepository;
      if (entity === CompanyStatusHistoryEntity) return historyRepository;
      return { update: jest.fn() };
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (handler) => handler(entityManager)),
  };
  return {
    dataSource,
    entityManager,
    updateBuilder,
    historyRepository,
  };
};

describe("CompanyManagementService lifecycle", () => {
  it("persists the pending-lock reason, history and outbox in one transaction", async () => {
    const harness = createTransactionHarness();
    const outbox = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      flushCompany: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CompanyManagementService(
      {} as any,
      {} as any,
      {} as any,
      harness.dataSource as any,
      outbox as any,
    );
    const company = pendingCompany();
    jest.spyOn(service as any, "findCompany").mockResolvedValue(company);
    jest
      .spyOn(service as any, "getCompanyAdminRecipients")
      .mockResolvedValue([{ id: 90, email: "owner@example.com" }]);
    jest.spyOn(service, "detail").mockResolvedValue({ id: 10 } as any);

    await service.lockReview(10, actor(1, RoleTypes.SuperAdmin), {
      reason: "Нужно уточнить реквизиты",
    });

    expect(harness.updateBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({
        review_locked_by_user_id: 1,
        review_lock_reason: "Нужно уточнить реквизиты",
      }),
    );
    expect(harness.historyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: CompanyLifecycleAction.ReviewLocked,
        reason: "Нужно уточнить реквизиты",
      }),
    );
    expect(outbox.enqueue).toHaveBeenCalledWith(
      harness.entityManager,
      expect.objectContaining({
        companyId: 10,
        historyId: 44,
        recipients: [{ userId: 90, email: "owner@example.com" }],
        email: expect.objectContaining({
          template: "company-access-limited",
          context: expect.objectContaining({
            reason: "Нужно уточнить реквизиты",
          }),
        }),
      }),
    );
    expect(outbox.flushCompany).toHaveBeenCalledWith(10);
  });

  it("does not complete a state change when transactional outbox insert fails", async () => {
    const harness = createTransactionHarness();
    const outbox = {
      enqueue: jest.fn().mockRejectedValue(new Error("OUTBOX_INSERT_FAILED")),
      flushCompany: jest.fn(),
    };
    const service = new CompanyManagementService(
      {} as any,
      {} as any,
      {} as any,
      harness.dataSource as any,
      outbox as any,
    );
    jest.spyOn(service as any, "findCompany").mockResolvedValue(pendingCompany());
    jest
      .spyOn(service as any, "getCompanyAdminRecipients")
      .mockResolvedValue([{ id: 90, email: "owner@example.com" }]);

    await expect(
      service.lockReview(10, actor(1, RoleTypes.SuperAdmin), {
        reason: "Причина",
      }),
    ).rejects.toThrow("OUTBOX_INSERT_FAILED");
    expect(outbox.flushCompany).not.toHaveBeenCalled();
  });

  it("rejects pending lock and manager assignment below the service layer", async () => {
    const harness = createTransactionHarness();
    const service = new CompanyManagementService(
      {} as any,
      {} as any,
      {} as any,
      harness.dataSource as any,
      {} as any,
    );
    const technician = actor(2, RoleTypes.TechnicalSpecialist);

    await expect(
      service.lockReview(10, technician, { reason: "Причина" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assignManager(10, technician, { responsible_manager_id: 3 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(harness.dataSource.transaction).not.toHaveBeenCalled();
  });

  it("never approves a locked pending application", async () => {
    const harness = createTransactionHarness();
    const outbox = { enqueue: jest.fn(), flushCompany: jest.fn() };
    const service = new CompanyManagementService(
      {} as any,
      {} as any,
      {} as any,
      harness.dataSource as any,
      outbox as any,
    );
    jest
      .spyOn(service as any, "findCompany")
      .mockResolvedValue(pendingCompany(true));

    await expect(
      service.approve(10, actor(7, RoleTypes.PartnerManager), {}),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(harness.dataSource.transaction).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
