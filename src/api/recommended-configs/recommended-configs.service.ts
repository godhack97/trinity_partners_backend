import { Injectable, NotFoundException } from "@nestjs/common";
import { RecommendedConfigRepository } from "@orm/repositories";
import { CreateRecommendedConfigDto } from "./dto/request/create-recommended-config.dto";

@Injectable()
export class RecommendedConfigsService {
  constructor(
    private readonly configRepository: RecommendedConfigRepository,
  ) {}

  async findAll(serverId?: string) {
    if (serverId) {
      return this.configRepository.findByServerId(serverId);
    }
    return this.configRepository.findAllActive();
  }

  async findOne(id: number) {
    const config = await this.configRepository.findById(id);
    if (!config) {
      throw new NotFoundException("Конфигурация не найдена");
    }
    return config;
  }

  async getCount() {
    return this.configRepository.count({ where: { is_active: true } });
  }

  async create(dto: CreateRecommendedConfigDto) {
    return this.configRepository.save({
      category: dto.category,
      category_label: dto.category_label,
      server_id: dto.server_id,
      server_name: dto.server_name,
      description: dto.description,
      components: dto.components,
      image: dto.image,
      is_active: dto.is_active ?? true,
    });
  }

  async update(id: number, dto: Partial<CreateRecommendedConfigDto>) {
    const config = await this.configRepository.findById(id);
    if (!config) {
      throw new NotFoundException("Конфигурация не найдена");
    }

    await this.configRepository.update(id, dto as any);
    return this.configRepository.findById(id);
  }

  async remove(id: number) {
    const config = await this.configRepository.findById(id);
    if (!config) {
      throw new NotFoundException("Конфигурация не найдена");
    }
    await this.configRepository.softDelete(id);
  }
}
