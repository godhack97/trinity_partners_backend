import { HttpException } from "@nestjs/common";
import { DealStatus } from "@orm/entities";
import { RoleTypes } from "@app/types/RoleTypes";
import { DealService } from "./deal.service";

const makeService = () => {
  const dealRepository = {
    mutateDealConfigurations: jest.fn().mockResolvedValue("updated"),
  };
  const service = new DealService(
    {} as any,
    {} as any,
    dealRepository as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { get: jest.fn() } as any,
    {} as any,
  );
  const deal = {
    id: 7,
    deal_num: "D-7",
    creator_id: 31,
    responsible_manager_id: null as number | null,
    status: DealStatus.Draft,
    configurations: [{ id: "old" }],
  };
  jest.spyOn(service, "findOne").mockResolvedValue(deal as any);
  (service as any).notifyDealChanged = jest.fn().mockResolvedValue(undefined);

  return { service, dealRepository, deal };
};

describe("DealService configuration mutation persistence", () => {
  it("routes add through the locked repository primitive", async () => {
    const { service, dealRepository } = makeService();

    await service.addConfigurations(
      7,
      { id: 31 } as any,
      { configurations: [{ id: "new" }] } as any,
    );

    expect(dealRepository.mutateDealConfigurations).toHaveBeenCalledWith(
      7,
      DealStatus.Draft,
      { kind: "creator", userId: 31 },
      { type: "append", configurations: [{ id: "new" }] },
    );
  });

  it("routes remove through the locked repository primitive", async () => {
    const { service, dealRepository } = makeService();

    await service.removeConfiguration(7, "old", { id: 31 } as any);

    expect(dealRepository.mutateDealConfigurations).toHaveBeenCalledWith(
      7,
      DealStatus.Draft,
      { kind: "creator", userId: 31 },
      { type: "remove", configurationId: "old" },
    );
  });

  it("routes replace through the locked repository primitive", async () => {
    const { service, dealRepository } = makeService();

    await service.updateConfiguration(
      7,
      "old",
      { id: 31 } as any,
      { configurations: [{ id: "payload", name: "new" }] } as any,
    );

    expect(dealRepository.mutateDealConfigurations).toHaveBeenCalledWith(
      7,
      DealStatus.Draft,
      { kind: "creator", userId: 31 },
      {
        type: "replace",
        configurationId: "old",
        configuration: { id: "payload", name: "new" },
      },
    );
  });

  it("lets the assigned PartnerManager edit a partner configuration", async () => {
    const { service, dealRepository, deal } = makeService();
    deal.responsible_manager_id = 44;
    const manager = {
      id: 44,
      role: { name: RoleTypes.PartnerManager },
      roles: [],
    } as any;

    await service.addConfigurations(7, manager, {
      configurations: [{ id: "vendor" }],
    } as any);

    expect(dealRepository.mutateDealConfigurations).toHaveBeenCalledWith(
      7,
      DealStatus.Draft,
      { kind: "responsible_manager", userId: 44 },
      { type: "append", configurations: [{ id: "vendor" }] },
    );
  });

  it.each([
    [
      "add",
      (service: DealService) =>
        service.addConfigurations(
          7,
          { id: 31 } as any,
          { configurations: [{ id: "new" }] } as any,
        ),
    ],
    [
      "remove",
      (service: DealService) =>
        service.removeConfiguration(7, "old", { id: 31 } as any),
    ],
    [
      "replace",
      (service: DealService) =>
        service.updateConfiguration(
          7,
          "old",
          { id: 31 } as any,
          { configurations: [{ id: "new" }] } as any,
        ),
    ],
  ])("returns 409 when a concurrent submit wins before %s", async (_name, run) => {
    const { service, dealRepository } = makeService();
    dealRepository.mutateDealConfigurations.mockResolvedValue("stale");

    let error: HttpException | undefined;
    try {
      await run(service);
    } catch (caught) {
      error = caught as HttpException;
    }

    expect(error).toBeInstanceOf(HttpException);
    expect(error?.getStatus()).toBe(409);
    expect(error?.message).toContain("уже была отправлена");
    expect((service as any).notifyDealChanged).not.toHaveBeenCalled();
  });

  it.each([
    [
      "remove",
      (service: DealService) =>
        service.removeConfiguration(7, "missing", { id: 31 } as any),
    ],
    [
      "replace",
      (service: DealService) =>
        service.updateConfiguration(
          7,
          "missing",
          { id: 31 } as any,
          { configurations: [{ id: "new" }] } as any,
        ),
    ],
  ])("keeps the 404 contract when %s targets an absent item", async (_name, run) => {
    const { service, dealRepository } = makeService();
    dealRepository.mutateDealConfigurations.mockResolvedValue(
      "configuration_not_found",
    );

    let error: HttpException | undefined;
    try {
      await run(service);
    } catch (caught) {
      error = caught as HttpException;
    }

    expect(error).toBeInstanceOf(HttpException);
    expect(error?.getStatus()).toBe(404);
  });
});
