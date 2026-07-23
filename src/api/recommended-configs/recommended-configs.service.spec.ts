import { BadRequestException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateRecommendedConfigDto,
  UpdateRecommendedConfigDto,
} from "./dto/request/create-recommended-config.dto";
import { RecommendedConfigResponseDto } from "./dto/response/recommended-config-response.dto";
import { RecommendedConfigsService } from "./recommended-configs.service";

const serverId = "11111111-1111-4111-8111-111111111111";
const componentId = "22222222-2222-4222-8222-222222222222";
const platformCover = "/public/configurator/server/front.webp";
const legacyPlatformCover = "/public/configurator/server/legacy.webp";
const canonicalServer = {
  id: serverId,
  name: "Canonical server",
  images: [
    "  ",
    `  ${platformCover}  `,
    "/public/configurator/server/rear.webp",
  ],
  image: `  ${legacyPlatformCover}  `,
};
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
    findOne: jest.fn().mockResolvedValue(canonicalServer),
    find: jest.fn().mockResolvedValue([canonicalServer]),
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
  it("preserves nested component fields in the public response", () => {
    const response = plainToInstance(
      RecommendedConfigResponseDto,
      { id: 1, ...validPayload },
      { strategy: "excludeAll" },
    );

    expect(response.components).toEqual([{ componentId, amount: 2 }]);
  });

  it("accepts a strict nested template and a partial update", async () => {
    const create = plainToInstance(CreateRecommendedConfigDto, validPayload);
    const update = plainToInstance(UpdateRecommendedConfigDto, {
      is_active: false,
    });

    expect(
      await validate(create, {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toHaveLength(0);
    expect(
      await validate(update, {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toHaveLength(0);
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
      { id: 1, is_active: true, image: null },
      { id: 2, is_active: false, image: null },
    ]);
    expect(repository.findAllAdmin).toHaveBeenCalledTimes(1);
  });

  it("validates compatibility and stores the canonical server name and cover", async () => {
    const { service, repository, serverRepository, configuratorService } =
      makeService();

    const saved = await service.create({
      ...validPayload,
      image: "https://client.test/ignored.png",
    });

    expect(configuratorService.validateConfiguration).toHaveBeenCalledWith({
      server_id: serverId,
      items: [{ component_id: componentId, qty: 2, source: "manual" }],
      options: { strict: true },
      support: {
        id: "standard",
        name: "Стандартная гарантия",
        years: 3,
        price: 0,
      },
    });
    expect(serverRepository.findOne).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        image: true,
        images: true,
      },
      where: {
        id: serverId,
      },
      loadEagerRelations: false,
    });
    expect(saved.server_name).toBe("Canonical server");
    expect(saved.image).toBe(platformCover);
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it("stores normalized components when validation removes a legacy service", async () => {
    const legacyServiceId = "33333333-3333-4333-8333-333333333333";
    const { service, repository } = makeService({
      configuratorService: {
        validateConfiguration: jest.fn().mockResolvedValue({
          is_valid: true,
          errors: [],
          warnings: [],
          normalized_configuration: {
            items: [
              {
                component_id: componentId,
                qty: 2,
                source: "manual",
              },
            ],
          },
        }),
      },
    });

    await service.create({
      ...validPayload,
      components: [
        { componentId, amount: 2 },
        { componentId: legacyServiceId, amount: 1 },
      ],
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [{ componentId, amount: 2 }],
      }),
    );
  });

  it("uses the platform cover on update instead of the stored or supplied image", async () => {
    const { service } = makeService({
      repository: {
        findById: jest.fn().mockResolvedValue({
          id: 1,
          ...validPayload,
          image: "https://stored.test/stale.png",
        }),
      },
    });

    await expect(
      service.update(1, { image: "https://client.test/ignored-update.png" }),
    ).resolves.toEqual(
      expect.objectContaining({
        image: platformCover,
        server_name: "Canonical server",
      }),
    );
  });

  it("falls back to the trimmed legacy platform image when the gallery has no cover", async () => {
    const { service } = makeService({
      serverRepository: {
        findOne: jest.fn().mockResolvedValue({
          ...canonicalServer,
          images: ["", "   "],
          image: `  ${legacyPlatformCover}  `,
        }),
      },
    });

    await expect(service.create(validPayload)).resolves.toEqual(
      expect.objectContaining({ image: legacyPlatformCover }),
    );
  });

  it("hydrates all public configurations with current platform covers in one batch", async () => {
    const secondServerId = "33333333-3333-4333-8333-333333333333";
    const find = jest.fn().mockResolvedValue([
      canonicalServer,
      {
        id: secondServerId,
        images: [],
        image: ` ${legacyPlatformCover} `,
      },
    ]);
    const { service, serverRepository } = makeService({
      repository: {
        findAllActive: jest.fn().mockResolvedValue([
          {
            id: 1,
            server_id: serverId,
            image: "https://stored.test/stale-1.png",
          },
          {
            id: 2,
            server_id: serverId,
            image: "https://stored.test/stale-2.png",
          },
          {
            id: 3,
            server_id: secondServerId,
            image: "https://stored.test/stale-3.png",
          },
        ]),
      },
      serverRepository: { find },
    });

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ id: 1, image: platformCover }),
      expect.objectContaining({ id: 2, image: platformCover }),
      expect.objectContaining({ id: 3, image: legacyPlatformCover }),
    ]);
    expect(serverRepository.find).toHaveBeenCalledTimes(1);
    expect(serverRepository.find).toHaveBeenCalledWith({
      select: {
        id: true,
        image: true,
        images: true,
      },
      where: {
        id: expect.anything(),
      },
      loadEagerRelations: false,
    });
  });

  it("hydrates a public item and the admin list with current platform covers", async () => {
    const staleConfig = {
      id: 1,
      server_id: serverId,
      image: "https://stored.test/stale.png",
      is_active: true,
    };
    const { service, serverRepository } = makeService({
      repository: {
        findActiveById: jest.fn().mockResolvedValue(staleConfig),
        findAllAdmin: jest
          .fn()
          .mockResolvedValue([
            staleConfig,
            { ...staleConfig, id: 2, is_active: false },
          ]),
      },
    });

    await expect(service.findOne(1)).resolves.toEqual(
      expect.objectContaining({ id: 1, image: platformCover }),
    );
    await expect(service.findAllAdmin()).resolves.toEqual([
      expect.objectContaining({ id: 1, image: platformCover }),
      expect.objectContaining({ id: 2, image: platformCover }),
    ]);
    expect(serverRepository.find).toHaveBeenCalledTimes(2);
  });

  it("returns null images for a missing platform or a platform without images", async () => {
    const missingServerId = "44444444-4444-4444-8444-444444444444";
    const emptyServerId = "55555555-5555-4555-8555-555555555555";
    const { service } = makeService({
      repository: {
        findAllActive: jest.fn().mockResolvedValue([
          {
            id: 1,
            server_id: missingServerId,
            image: "https://stored.test/stale.png",
          },
          {
            id: 2,
            server_id: emptyServerId,
            image: "https://stored.test/stale.png",
          },
        ]),
      },
      serverRepository: {
        find: jest.fn().mockResolvedValue([
          {
            id: emptyServerId,
            images: ["", "   "],
            image: " ",
          },
        ]),
      },
    });

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ id: 1, image: null }),
      expect.objectContaining({ id: 2, image: null }),
    ]);
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
