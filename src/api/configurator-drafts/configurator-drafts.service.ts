import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfiguratorDraftRepository } from "@orm/repositories";
import { UserEntity } from "@orm/entities";
import { CreateConfiguratorDraftDto } from "./dto/request/create-configurator-draft.dto";
import { UpdateConfiguratorDraftDto } from "./dto/request/update-configurator-draft.dto";

@Injectable()
export class ConfiguratorDraftsService {
  constructor(
    private readonly draftRepository: ConfiguratorDraftRepository,
  ) {}

  async findAll(auth_user: UserEntity) {
    return this.draftRepository.findByCreatorId(auth_user.id);
  }

  async findOne(id: number, auth_user: UserEntity) {
    const draft = await this.draftRepository.findById(id);

    if (!draft) {
      throw new HttpException(
        "Конфигурация не найдена",
        HttpStatus.NOT_FOUND,
      );
    }

    if (draft.creator_id !== auth_user.id) {
      throw new HttpException(
        "У вас нет доступа к этой конфигурации",
        HttpStatus.FORBIDDEN,
      );
    }

    return draft;
  }

  async create(auth_user: UserEntity, dto: CreateConfiguratorDraftDto) {
    const draft = await this.draftRepository.save({
      creator_id: auth_user.id,
      title: dto.title,
      server_id: dto.server_id,
      serverbox_height_id: dto.serverbox_height_id,
      components: dto.components || [],
      total_price: dto.total_price || 0,
      description: dto.description,
    });

    return draft;
  }

  async update(
    id: number,
    auth_user: UserEntity,
    dto: UpdateConfiguratorDraftDto,
  ) {
    const draft = await this.findOne(id, auth_user);

    await this.draftRepository.update(draft.id, {
      ...dto,
    });

    return this.draftRepository.findById(draft.id);
  }

  async duplicate(id: number, auth_user: UserEntity) {
    const original = await this.findOne(id, auth_user);

    const copy = await this.draftRepository.save({
      creator_id: auth_user.id,
      title: `${original.title} (копия)`,
      server_id: original.server_id,
      serverbox_height_id: original.serverbox_height_id,
      components: original.components,
      total_price: original.total_price,
      description: original.description,
    });

    return copy;
  }

  async remove(id: number, auth_user: UserEntity) {
    const draft = await this.findOne(id, auth_user);
    await this.draftRepository.softDelete(draft.id);
  }

  async getCount(auth_user: UserEntity): Promise<number> {
    return this.draftRepository.count({
      where: { creator_id: auth_user.id },
    });
  }
}
