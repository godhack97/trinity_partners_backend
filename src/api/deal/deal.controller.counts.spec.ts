import { DealController } from "./deal.controller";

describe("DealController scoped count contract", () => {
  it.each([
    ["getCount", "getCount"],
    ["getAllCount", "getAllCount"],
    ["getModerationCount", "getModerationCount"],
    ["getRegisteredCount", "getRegisteredCount"],
    ["getCanceledCount", "getCanceledCount"],
    ["getWinCount", "getWinCount"],
    ["getLooseCount", "getLooseCount"],
  ])("forwards the authenticated actor from %s", async (handler, method) => {
    const actor = { id: 17 } as any;
    const dealService = { [method]: jest.fn().mockResolvedValue(3) };
    const controller = new DealController(dealService as any);

    await expect((controller as any)[handler](actor)).resolves.toBe(3);
    expect(dealService[method]).toHaveBeenCalledWith(actor);
  });
});
