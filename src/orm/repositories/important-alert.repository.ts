import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ImportantAlertEntity } from "@orm/entities";
import { Repository } from "typeorm";

@Injectable()
export class ImportantAlertRepository extends Repository<ImportantAlertEntity> {
  constructor(
    @InjectRepository(ImportantAlertEntity)
    private repo: Repository<ImportantAlertEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findById(id: number) {
    return await this.findOneBy({ id });
  }

  public async findActive() {
    return await this.find({ where: { is_active: true } });
  }

  public async findAll() {
    return await this.find();
  }
}
