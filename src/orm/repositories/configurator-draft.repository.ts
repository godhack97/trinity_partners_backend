import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfiguratorDraftEntity } from "@orm/entities/configurator-draft.entity";
import { Repository } from "typeorm";

@Injectable()
export class ConfiguratorDraftRepository extends Repository<ConfiguratorDraftEntity> {
  constructor(
    @InjectRepository(ConfiguratorDraftEntity)
    private repo: Repository<ConfiguratorDraftEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findById(id: number): Promise<ConfiguratorDraftEntity | null> {
    return await this.findOne({
      where: { id },
      relations: ["shared_by", "shared_by.user_info"],
    });
  }

  async findByCreatorId(creatorId: number): Promise<ConfiguratorDraftEntity[]> {
    return await this.find({
      where: { creator_id: creatorId },
      relations: ["shared_by", "shared_by.user_info"],
      order: { id: "DESC" },
    });
  }
}
