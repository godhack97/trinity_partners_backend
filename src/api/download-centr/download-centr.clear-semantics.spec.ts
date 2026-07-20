import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateDownloadCentrDto } from "./download-centr.dto";
import { DownloadCentrService } from "./download-centr.service";

describe("download centre partial update", () => {
  it("accepts a partial DTO and explicit empty text values", async () => {
    const dto = plainToInstance(UpdateDownloadCentrDto, {
      description: "",
      tags: "",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBeUndefined();
    expect(dto.description).toBe("");
    expect(dto.tags).toBe("");
  });

  it("persists empty description and tags without requiring a name", async () => {
    const entity: any = {
      id: 1,
      name: "Driver",
      description: "Old description",
      tags: "bios,server",
      filePath: "/upload/centr/a.pdf",
    };
    const repository: any = {
      findOne: jest.fn().mockResolvedValue(entity),
      save: jest.fn(async (value) => value),
    };
    const service = new DownloadCentrService(repository);

    const result = await service.update(1, { description: "", tags: "" });

    expect(result.name).toBe("Driver");
    expect(result.description).toBe("");
    expect(result.tags).toBe("");
  });
});
