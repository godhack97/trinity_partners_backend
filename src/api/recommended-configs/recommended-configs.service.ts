import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CnfServerRepository, RecommendedConfigRepository } from "@orm/repositories";
import {
  CreateRecommendedConfigDto,
  UpdateRecommendedConfigDto,
} from "./dto/request/create-recommended-config.dto";
import { ConfiguratorService } from "@api/configurator/configurator.service";
import { RecommendedConfigEntity } from "@orm/entities";

@Injectable()
export class RecommendedConfigsService {
  constructor(
    private readonly configRepository: RecommendedConfigRepository,
    private readonly serverRepository: CnfServerRepository,
    private readonly configuratorService: ConfiguratorService,
  ) {}

  async findAll(serverId?: string) {
    if (serverId) {
      return this.configRepository.findByServerId(serverId);
    }
    return this.configRepository.findAllActive();
  }

  async findOne(id: number) {
    const config = await this.configRepository.findActiveById(id);
    if (!config) {
      throw new NotFoundException("Конфигурация не найдена");
    }
    return config;
  }

  async findAllAdmin() {
    return this.configRepository.findAllAdmin();
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
    const values = await this.validateAndNormalize(merged, merged.is_active !== false);
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
    const server = await this.serverRepository.findOneBy({ id: dto.server_id });
    if (!server) {
      throw new BadRequestException("Сервер рекомендованной конфигурации не найден");
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
      image: dto.image ?? null,
      is_active: dto.is_active ?? true,
    };
  }
}
