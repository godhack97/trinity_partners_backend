import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LogsPagedRequestDto } from "./dto/logs-paged.request.dto";
import {
  REQUIRED_HISTORY_ENTITIES,
  UserActionsService,
} from "./user-actions.service";

describe("user actions contract", () => {
  it("validates and transforms bounded pagination/search parameters", async () => {
    const valid = plainToInstance(LogsPagedRequestDto, {
      skip: "20",
      take: "50",
      search: " deal ",
      order: "asc",
    });
    const invalid = plainToInstance(LogsPagedRequestDto, {
      skip: -1,
      take: 101,
      order: "sideways",
    });

    expect(await validate(valid)).toHaveLength(0);
    expect(valid).toEqual(expect.objectContaining({
      skip: 20,
      take: 50,
      search: "deal",
      order: "ASC",
    }));
    expect((await validate(invalid)).length).toBeGreaterThan(0);
  });

  it("keeps every admin history entity in the explicit registry contract", () => {
    expect(REQUIRED_HISTORY_ENTITIES).toEqual(expect.arrayContaining([
      "important_alerts",
      "documents",
      "document_groups",
      "document_tags",
      "document_access_levels",
      "download_centr",
      "cnf_platform_profiles",
      "recommended_configs",
    ]));
  });

  it("rejects an unknown entity with a controlled 400 error", async () => {
    const service: any = Object.create(UserActionsService.prototype);
    service.entityRepoMap = { news: { repo: {}, field: "name" } };

    await expect(service.findByEntity("unknown", 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("applies server-side search, order and pagination", async () => {
    const getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
    const builder: any = {
      leftJoinAndSelect: jest.fn(),
      orderBy: jest.fn(),
      skip: jest.fn(),
      take: jest.fn(),
      andWhere: jest.fn(),
      getManyAndCount,
    };
    Object.keys(builder).forEach(key => {
      if (key !== "getManyAndCount") builder[key].mockReturnValue(builder);
    });
    const service: any = Object.create(UserActionsService.prototype);
    service.userActionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    };

    await expect(service.findPaged({
      skip: 20,
      take: 20,
      search: "deal",
      order: "ASC",
    })).resolves.toEqual({ logs: [], total: 0, skip: 20, take: 20 });
    expect(builder.orderBy).toHaveBeenCalledWith("action.created_at", "ASC");
    expect(builder.skip).toHaveBeenCalledWith(20);
    expect(builder.take).toHaveBeenCalledWith(20);
    expect(builder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("user.email LIKE :search"),
      { search: "%deal%" },
    );
  });
});
