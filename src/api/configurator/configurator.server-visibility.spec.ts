import { ConfiguratorService } from "./configurator.service";

const createQueryBuilder = () => {
  const queryBuilder: any = {
    leftJoinAndMapOne: jest.fn(),
    leftJoinAndMapMany: jest.fn(),
    orderBy: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  queryBuilder.leftJoinAndMapOne.mockReturnValue(queryBuilder);
  queryBuilder.leftJoinAndMapMany.mockReturnValue(queryBuilder);
  queryBuilder.orderBy.mockReturnValue(queryBuilder);
  queryBuilder.andWhere.mockReturnValue(queryBuilder);

  return queryBuilder;
};

describe("ConfiguratorService server publication", () => {
  it("publishes only servers with an existing active platform profile", async () => {
    const queryBuilder = createQueryBuilder();
    const service: any = Object.create(ConfiguratorService.prototype);
    service.cnfServerRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    await service.getServers(false);

    expect(queryBuilder.andWhere.mock.calls.map(([condition]) => condition)).toEqual([
      "cpp.id IS NOT NULL",
      "cpp.is_active = 1",
      "TRIM(cpp.platform_code) <> ''",
      "TRIM(cpp.family) <> ''",
      "TRIM(cpp.ram_type) <> ''",
    ]);
  });

  it("keeps inactive and incomplete servers visible to the admin query", async () => {
    const queryBuilder = createQueryBuilder();
    const service: any = Object.create(ConfiguratorService.prototype);
    service.cnfServerRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    await service.getServers(true);

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
  });
});
