import { DistributorService } from "./distributor.service";

describe("DistributorService", () => {
  it("counts only distributors visible in the active list", async () => {
    const distributorRepository = {
      count: jest.fn().mockResolvedValue(0),
    };
    const service = new DistributorService(distributorRepository as any);

    await expect(service.getCount()).resolves.toBe(0);
    expect(distributorRepository.count).toHaveBeenCalledWith({
      where: {
        deleted_at: expect.objectContaining({ _type: "isNull" }),
      },
    });
  });
});
