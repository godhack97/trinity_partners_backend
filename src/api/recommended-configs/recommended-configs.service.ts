import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CnfServerRepository,
  RecommendedConfigRepository,
} from "@orm/repositories";
import {
  CreateRecommendedConfigDto,
  UpdateRecommendedConfigDto,
} from "./dto/request/create-recommended-config.dto";
import { ConfiguratorService } from "@api/configurator/configurator.service";
import { RecommendedConfigEntity } from "@orm/entities";
import type { CnfServerEntity } from "@orm/entities/cnf/cnf-server.entity";
import { In } from "typeorm";

@Injectable()
export class RecommendedConfigsService {
  constructor(
    private readonly configRepository: RecommendedConfigRepository,
    private readonly serverRepository: CnfServerRepository,
    private readonly configuratorService: ConfiguratorService,
  ) {}

  async findAll(serverId?: string) {
    const configs = serverId
      ? await this.configRepository.findByServerId(serverId)
      : await this.configRepository.findAllActive();
    return this.withPlatformImages(configs);
  }

  async findOne(id: number) {
    const config = await this.configRepository.findActiveById(id);
    if (!config) {
      throw new NotFoundException("Конфигурация не найдена");
    }
    const [result] = await this.withPlatformImages([config]);
    return result;
  }

  async findAllAdmin() {
    const configs = await this.configRepository.findAllAdmin();
    return this.withPlatformImages(configs);
  }

  async getCount() {
    return this.configRepository.count({ where: { is_active: true } });
  }

  async create(dto: CreateRecommendedConfigDto) {
    const values = await this.validateAndNormalize(dto, true);
    return this.configRepository.save(values);
  }

  async update(id: number, dto: UpdateRecommendedConfigDto) {
    const config = await this.configRepository.findById(id);
    if (!config) {
      throw new NotFoundException("Конфигурация не найдена");
    }

    const merged = {
      ...config,
      ...dto,
      server_id: dto.server_id ?? config.server_id,
      components: dto.components ?? config.components,
      is_active: dto.is_active ?? config.is_active,
    } as CreateRecommendedConfigDto;
    const values = await this.validateAndNormalize(
      merged,
      merged.is_active !== false,
    );
    return this.configRepository.save(
      this.configRepository.merge(config, values),
    );
  }

  async remove(id: number) {
    const config = await this.configRepository.findById(id);
    if (!config) {
      throw new NotFoundException("Конфигурация не найдена");
    }
    await this.configRepository.softDelete(id);
  }

  private async validateAndNormalize(
    dto: CreateRecommendedConfigDto,
    requireCompatibility: boolean,
  ): Promise<Partial<RecommendedConfigEntity>> {
    const components = Array.isArray(dto.components) ? dto.components : [];
    const server = await this.serverRepository.findOne({
      select: {
        id: true,
        name: true,
        image: true,
        images: true,
      },
      where: {
        id: dto.server_id,
      },
      loadEagerRelations: false,
    });
    if (!server) {
      throw new BadRequestException(
        "Сервер рекомендованной конфигурации не найден",
      );
    }

    const validation = await this.configuratorService.validateConfiguration({
      server_id: dto.server_id,
      items: components.map((component) => ({
        component_id: component.componentId,
        qty: component.amount,
        source: "manual" as const,
      })),
      options: { strict: true },
    });
    if (requireCompatibility && !validation.is_valid) {
      throw new BadRequestException({
        message: "Рекомендованная конфигурация несовместима с сервером",
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    return {
      category: dto.category.trim(),
      category_label: dto.category_label.trim(),
      server_id: server.id,
      server_name: server.name,
      description: dto.description ?? null,
      components: components.map((component) => ({
        componentId: component.componentId,
        amount: Number(component.amount),
      })),
      image: this.getPlatformImage(server),
      is_active: dto.is_active ?? true,
    };
  }

  private getPlatformImage(
    server?: Pick<CnfServerEntity, "image" | "images"> | null,
  ) {
    const images = Array.isArray(server?.images)
      ? server.images
          .filter((image): image is string => typeof image === "string")
          .map((image) => image.trim())
          .filter(Boolean)
      : [];
    const legacyImage =
      typeof server?.image === "string" ? server.image.trim() : "";

    return images[0] || legacyImage || null;
  }

  private async withPlatformImages<T extends RecommendedConfigEntity>(
    configs: T[],
  ): Promise<T[]> {
    const serverIds = [
      ...new Set(
        configs
          .map((config) => config.server_id)
          .filter((serverId): serverId is string => Boolean(serverId)),
      ),
    ];
    if (!serverIds.length) {
      return configs.map((config) => ({ ...config, image: null })) as T[];
    }

    const servers = await this.serverRepository.find({
      select: {
        id: true,
        image: true,
        images: true,
      },
      where: {
        id: In(serverIds),
      },
      loadEagerRelations: false,
    });
    const serversById = new Map(servers.map((server) => [server.id, server]));

    return configs.map((config) => {
      const server = config.server_id
        ? serversById.get(config.server_id)
        : undefined;
      if (!server) return { ...config, image: null };

      return {
        ...config,
        image: this.getPlatformImage(server),
      };
    }) as T[];
  }
}
