import { UserActionsService } from "./user-actions.service";

describe("UserActionsService Bitrix24 deduplication", () => {
  const queryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn(),
  };
  const repository = {
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const service = new UserActionsService(repository as any);

  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    repository.createQueryBuilder.mockReturnValue(queryBuilder);
    repository.create.mockImplementation((value) => value);
    repository.save.mockResolvedValue({ id: 1 });
  });

  it("suppresses an identical noisy background failure", async () => {
    queryBuilder.getOne.mockResolvedValue({ id: 5 });

    await service.log(7, "bitrix24_lead_sync_error", {
      entity: "deals",
      deal_id: 41,
      error: "timeout",
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith("action");
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("always persists repeated operator actions", async () => {
    queryBuilder.getOne.mockResolvedValue({ id: 5 });
    const details = { entity: "deals", params: { id: "41" } };

    await service.log(3, "bitrix24_admin_force_sync_lead", details);

    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith({
      user_id: 3,
      action: "bitrix24_admin_force_sync_lead",
      details,
    });
    expect(repository.save).toHaveBeenCalledWith({
      user_id: 3,
      action: "bitrix24_admin_force_sync_lead",
      details,
    });
  });

  it("keeps successful Bitrix24 events instead of deduplicating them", async () => {
    await service.log(7, "bitrix24_lead_updated", {
      entity: "deals",
      deal_id: 41,
    });

    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
