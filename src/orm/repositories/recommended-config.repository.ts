import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RecommendedConfigEntity } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class RecommendedConfigRepository extends Repository<RecommendedConfigEntity> {
  constructor(
    @InjectRepository(RecommendedConfigEntity)
    private repo: Repository<RecommendedConfigEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findById(id: number) {
    return await this.findOneBy({ id });
  }

  public async findByServerId(serverId: string) {
    return await this.find({
      where: { server_id: serverId, is_active: true },
    });
  }

  public async findAllActive() {
    return await this.find({
      where: { is_active: true },
    });
  }
}
