import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CnfComponentTypeEntity } from "src/orm/entities/cnf/cnf-component-type.entity";
import { Repository } from "typeorm";

@Injectable()
export class CnfComponentTypeRepository extends Repository<CnfComponentTypeEntity> {
  constructor(
    @InjectRepository(CnfComponentTypeEntity)
    private repo: Repository<CnfComponentTypeEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
