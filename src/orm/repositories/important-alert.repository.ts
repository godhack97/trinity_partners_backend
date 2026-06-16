import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ImportantAlertEntity } from "@orm/entities";
import { IsNull, Repository } from "typeorm";

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

  public async findActiveForCompany(companyId?: number | null) {
    if (!companyId) {
      return await this.find({
        where: { is_active: true, target_company_id: IsNull() },
      });
    }

    return await this.createQueryBuilder("alert")
      .where("alert.is_active = :isActive", { isActive: true })
      .andWhere(
        "(alert.target_company_id IS NULL OR alert.target_company_id = :companyId)",
        { companyId },
      )
      .getMany();
  }

  public async findAll() {
    return await this.find();
  }
}
