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
    return await this.findOneBy({ id });
  }

  async findByCreatorId(creatorId: number): Promise<ConfiguratorDraftEntity[]> {
    return await this.find({
      where: { creator_id: creatorId },
      order: { id: "DESC" },
    });
  }
}
