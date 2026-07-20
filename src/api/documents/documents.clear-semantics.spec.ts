import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DocumentsService } from "./documents.service";
import { UpdateDocumentDto } from "./documents.dto";

describe("document update clear semantics", () => {
  it("transforms multipart empty values to null relations and an empty tag array", async () => {
    const dto = plainToInstance(UpdateDocumentDto, {
      group_id: "",
      access_level_id: "null",
      tag_ids: "",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toEqual(expect.objectContaining({
      group_id: null,
      access_level_id: null,
      tag_ids: [],
    }));
  });

  it("keeps omitted update fields undefined", async () => {
    const dto = plainToInstance(UpdateDocumentDto, {});

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.group_id).toBeUndefined();
    expect(dto.access_level_id).toBeUndefined();
    expect(dto.tag_ids).toBeUndefined();
  });

  it("clears persisted relations and tags when explicit clear values are provided", async () => {
    const document: any = {
      id: 1,
      name: "Datasheet",
      filePath: "/upload/documents/a.pdf",
      group_id: 10,
      access_level_id: 20,
      tags: [{ id: 30, name: "old" }],
    };
    const documentRepo: any = {
      findOne: jest.fn().mockResolvedValue(document),
      save: jest.fn(async (value) => value),
    };
    const tagRepo: any = { findBy: jest.fn() };
    const service = new DocumentsService(
      documentRepo,
      {} as any,
      tagRepo,
      {} as any,
      {} as any,
    );

    const result = await service.update(1, {
      group_id: null,
      access_level_id: null,
      tag_ids: [],
    });

    expect(result.group_id).toBeNull();
    expect(result.access_level_id).toBeNull();
    expect(result.tags).toEqual([]);
    expect(tagRepo.findBy).not.toHaveBeenCalled();
  });
});
