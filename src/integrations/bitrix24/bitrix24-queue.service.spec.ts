import { DealStatus } from "@orm/entities";
import { Bitrix24QueueService } from "./bitrix24-queue.service";

describe("Bitrix24QueueService manual sync results", () => {
  const bitrix24Service = {
    createContact: jest.fn(),
    createLead: jest.fn(),
    updateLead: jest.fn(),
  };
  const dealRepository = {
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    findBitrix24SyncCandidates: jest.fn(),
    claimBitrix24Sync: jest.fn(),
    finishBitrix24Sync: jest.fn(),
    update: jest.fn(),
  };
  const userRepository = {
    findOneBy: jest.fn(),
    update: jest.fn(),
  };
  const customerRepository = {
    findSimilar: jest.fn(),
    save: jest.fn(),
  };
  const userActionsService = {
    log: jest.fn(),
  };
  const service = new Bitrix24QueueService(
    bitrix24Service as any,
    dealRepository as any,
    userRepository as any,
    userActionsService as any,
  );

  const deal = (id: number) => ({
    id,
    creator_id: 7,
    distributor_id: 3,
    customer: {
      inn: "0000000000",
      email: "customer@example.test",
      first_name: "Test",
      last_name: "Customer",
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dealRepository.findOneBy.mockResolvedValue(deal(41));
    dealRepository.claimBitrix24Sync.mockImplementation(
      async (id: number) => ({ deal: deal(id), token: `lease-${id}` }),
    );
    dealRepository.finishBitrix24Sync.mockResolvedValue(true);
    dealRepository.update.mockResolvedValue({ affected: 1 });
    userRepository.findOneBy.mockResolvedValue({
      id: 7,
      bitrix24_contact_id: 90,
    });
    customerRepository.findSimilar.mockResolvedValue(deal(41).customer);
    customerRepository.save.mockImplementation(async (customer) => customer);
    userActionsService.log.mockResolvedValue(undefined);
  });

  it("returns false when Bitrix24 does not create a lead", async () => {
    bitrix24Service.createLead.mockResolvedValue(null);

    await expect(service.forceSyncLead(41)).resolves.toBe(false);

    expect(dealRepository.finishBitrix24Sync).toHaveBeenCalledWith(
      expect.objectContaining({ token: "lease-41" }),
      { success: false },
    );
    expect(userActionsService.log).toHaveBeenCalledWith(
      7,
      "bitrix24_lead_sync_failed",
      expect.objectContaining({ deal_id: 41 }),
    );
  });

  it("returns true only after the lead id and synced status are persisted", async () => {
    bitrix24Service.createLead.mockResolvedValue(555);

    await expect(service.forceSyncLead(41)).resolves.toBe(true);

    expect(dealRepository.finishBitrix24Sync).toHaveBeenCalledWith(
      expect.objectContaining({ token: "lease-41" }),
      { success: true, bitrix24LeadId: 555 },
    );
    expect(bitrix24Service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 41 }),
      deal(41).customer,
      "Distributor_3",
      90,
    );
    expect(customerRepository.findSimilar).not.toHaveBeenCalled();
  });

  it("marks a deal failed when its creator is missing", async () => {
    userRepository.findOneBy.mockResolvedValue(null);

    await expect(service.forceSyncLead(41)).resolves.toBe(false);

    expect(dealRepository.finishBitrix24Sync).toHaveBeenCalledWith(
      expect.objectContaining({ token: "lease-41" }),
      { success: false },
    );
    expect(bitrix24Service.createLead).not.toHaveBeenCalled();
  });

  it("never force-syncs a draft deal", async () => {
    dealRepository.findOneBy.mockResolvedValue({
      ...deal(41),
      status: DealStatus.Draft,
    });

    await expect(service.forceSyncLead(41)).resolves.toBe(false);

    expect(userRepository.findOneBy).not.toHaveBeenCalled();
    expect(bitrix24Service.createLead).not.toHaveBeenCalled();
    expect(dealRepository.claimBitrix24Sync).not.toHaveBeenCalled();
  });

  it("lets only the atomic claim winner call Bitrix24", async () => {
    dealRepository.claimBitrix24Sync.mockResolvedValue(null);

    await expect(service.forceSyncLead(41)).resolves.toBe(false);

    expect(dealRepository.claimBitrix24Sync).toHaveBeenCalledWith(41, true);
    expect(bitrix24Service.createLead).not.toHaveBeenCalled();
    expect(bitrix24Service.updateLead).not.toHaveBeenCalled();
    expect(dealRepository.finishBitrix24Sync).not.toHaveBeenCalled();
  });

  it("updates a linked lead during force sync and never creates another", async () => {
    const linkedDeal = { ...deal(41), bitrix24_deal_id: 777 };
    dealRepository.findOneBy.mockResolvedValue(linkedDeal);
    dealRepository.claimBitrix24Sync.mockResolvedValue({
      deal: linkedDeal,
      token: "lease-41",
    });
    bitrix24Service.updateLead.mockResolvedValue(true);

    await expect(service.forceSyncLead(41)).resolves.toBe(true);

    expect(bitrix24Service.updateLead).toHaveBeenCalledWith(
      777,
      linkedDeal,
      "Distributor_3",
      90,
    );
    expect(bitrix24Service.createLead).not.toHaveBeenCalled();
    expect(dealRepository.finishBitrix24Sync).toHaveBeenCalledWith(
      expect.objectContaining({ token: "lease-41" }),
      { success: true, bitrix24LeadId: 777 },
    );
  });

  it("reports mixed force-all outcomes instead of counting every call as success", async () => {
    dealRepository.findBy.mockResolvedValue([deal(41), deal(42)]);
    const syncSpy = jest
      .spyOn(service as any, "syncSingleLead")
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const delaySpy = jest
      .spyOn(service as any, "delay")
      .mockResolvedValue(undefined);

    await expect(service.forceResyncAllFailed()).resolves.toEqual({
      success: 1,
      failed: 1,
    });

    expect(syncSpy).toHaveBeenCalledTimes(2);
    expect(delaySpy).toHaveBeenCalledTimes(2);
    syncSpy.mockRestore();
    delaySpy.mockRestore();
  });
});
