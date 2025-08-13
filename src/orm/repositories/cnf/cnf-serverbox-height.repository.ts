import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CnfServerboxHeightEntity } from "src/orm/entities/cnf/cnf-serverbox-height.entity";
import { Repository } from "typeorm";

@Injectable()
export class CnfServerboxHeightRepository extends Repository<CnfServerboxHeightEntity> {
  constructor(
    @InjectRepository(CnfServerboxHeightEntity)
    private repo: Repository<CnfServerboxHeightEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
