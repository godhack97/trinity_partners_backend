import { BadRequestException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateRecommendedConfigDto,
  UpdateRecommendedConfigDto,
} from "./dto/request/create-recommended-config.dto";
import { RecommendedConfigsService } from "./recommended-configs.service";

const serverId = "11111111-1111-4111-8111-111111111111";
const componentId = "22222222-2222-4222-8222-222222222222";
const validPayload = {
  category: "ai-ml",
  category_label: "AI/ML",
  server_id: serverId,
  server_name: "Client supplied name",
  description: "GPU training",
  components: [{ componentId, amount: 2 }],
  image: "https://files.test/gpu.png",
  is_active: true,
};

const makeService = (overrides: any = {}) => {
  const repository: any = {
    findAllActive: jest.fn().mockResolvedValue([{ id: 1, is_active: true }]),
    findAllAdmin: jest.fn().mockResolvedValue([
      { id: 1, is_active: true },
      { id: 2, is_active: false },
    ]),
    findActiveById: jest.fn().mockResolvedValue({ id: 1, is_active: true }),
    findById: jest.fn().mockResolvedValue({ id: 1, ...validPayload }),
    save: jest.fn(async (value) => ({ id: value.id || 1, ...value })),
    merge: jest.fn((target, patch) => ({ ...target, ...patch })),
    softDelete: jest.fn(),
    count: jest.fn(),
    ...overrides.repository,
  };
  const serverRepository: any = {
    findOneBy: jest.fn().mockResolvedValue({
      id: serverId,
      name: "Canonical server",
    }),
    ...overrides.serverRepository,
  };
  const configuratorService: any = {
    validateConfiguration: jest.fn().mockResolvedValue({
      is_valid: true,
      errors: [],
      warnings: [],
    }),
    ...overrides.configuratorService,
  };
  return {
    service: new RecommendedConfigsService(
      repository,
      serverRepository,
      configuratorService,
    ),
    repository,
    serverRepository,
    configuratorService,
  };
};

describe("recommended config DTO", () => {
  it("accepts a strict nested template and a partial update", async () => {
    const create = plainToInstance(CreateRecommendedConfigDto, validPayload);
    const update = plainToInstance(UpdateRecommendedConfigDto, {
      is_active: false,
    });

    expect(await validate(create, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })).toHaveLength(0);
    expect(await validate(update, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })).toHaveLength(0);
  });

  it("rejects duplicate components, invalid amounts and an invalid category slug", async () => {
    const dto = plainToInstance(CreateRecommendedConfigDto, {
      ...validPayload,
      category: "AI ML",
      components: [
        { componentId, amount: 0 },
        { componentId, amount: 1 },
      ],
    });

    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});

describe("RecommendedConfigsService", () => {
  it("keeps inactive records out of public reads but includes them in admin list", async () => {
    const { service, repository } = makeService({
      repository: { findActiveById: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.findOne(2)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findAllAdmin()).resolves.toEqual([
      { id: 1, is_active: true },
      { id: 2, is_active: false },
    ]);
    expect(repository.findAllAdmin).toHaveBeenCalledTimes(1);
  });

  it("validates compatibility and stores the canonical server name", async () => {
    const { service, repository, configuratorService } = makeService();

    const saved = await service.create(validPayload);

    expect(configuratorService.validateConfiguration).toHaveBeenCalledWith({
      server_id: serverId,
      items: [{ component_id: componentId, qty: 2, source: "manual" }],
      options: { strict: true },
    });
    expect(saved.server_name).toBe("Canonical server");
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it("rejects an incompatible active template before persistence", async () => {
    const { service, repository } = makeService({
      configuratorService: {
        validateConfiguration: jest.fn().mockResolvedValue({
          is_valid: false,
          errors: [{ code: "PCIE_LIMIT_EXCEEDED" }],
          warnings: [],
        }),
      },
    });

    await expect(service.create(validPayload)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("allows an invalid record to be switched off but validates reactivation", async () => {
    const validateConfiguration = jest.fn().mockResolvedValue({
      is_valid: false,
      errors: [{ code: "COMPONENT_NOT_FOUND" }],
      warnings: [],
    });
    const { service, repository } = makeService({
      configuratorService: { validateConfiguration },
    });

    await expect(service.update(1, { is_active: false })).resolves.toEqual(
      expect.objectContaining({ is_active: false }),
    );
    expect(repository.save).toHaveBeenCalledTimes(1);

    await expect(service.update(1, { is_active: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("can disable a legacy record with an empty component list", async () => {
    const { service, repository, configuratorService } = makeService({
      repository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          ...validPayload,
          components: null,
        }),
      },
    });

    await expect(service.update(1, { is_active: false })).resolves.toEqual(
      expect.objectContaining({ components: [], is_active: false }),
    );
    expect(configuratorService.validateConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ items: [] }),
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
