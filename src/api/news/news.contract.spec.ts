import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NewsRequestDto } from "./dto/news.request.dto";
import { NewsService } from "./news.service";

const editorContent = JSON.stringify({
  time: 123,
  blocks: [{ type: "paragraph", data: { text: "Saved content" } }],
  version: "2.30.7",
});

describe("news contract", () => {
  it("requires name and EditorJS JSON but allows nullable images", async () => {
    const valid = plainToInstance(NewsRequestDto, {
      name: " News ",
      content: editorContent,
      photo: null,
      image_big: null,
    });
    const invalid = plainToInstance(NewsRequestDto, {
      name: "",
      content: "undefined",
      extra: true,
    });

    expect(await validate(valid, { whitelist: true, forbidNonWhitelisted: true }))
      .toHaveLength(0);
    expect(valid.name).toBe("News");
    expect((await validate(invalid, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })).length).toBeGreaterThan(0);
  });

  it("persists untouched valid editor content and canonical nullable images", async () => {
    const repository: any = {
      findBySlugOrName: jest.fn().mockResolvedValue(null),
      save: jest.fn(async value => ({ id: 1, ...value })),
    };
    const service = new NewsService(repository);

    const result = await service.create({
      name: "Новая статья",
      content: editorContent,
      photo: null,
      image_big: null,
    }, { id: 7 } as any);

    expect(result).toEqual(expect.objectContaining({
      content: editorContent,
      photo: null,
      image_big: null,
      author_id: 7,
    }));
  });

  it("rejects a structurally empty EditorJS document before persistence", async () => {
    const repository: any = {
      findBySlugOrName: jest.fn(),
      save: jest.fn(),
    };
    const service = new NewsService(repository);

    await expect(service.create({
      name: "Empty",
      content: JSON.stringify({ blocks: [] }),
      photo: null,
      image_big: null,
    }, { id: 7 } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
