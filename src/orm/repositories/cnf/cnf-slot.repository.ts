import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CnfSlotEntity } from "src/orm/entities/cnf/cnf-slot.entity";
import { Repository } from "typeorm";

@Injectable()
export class CnfSlotRepository extends Repository<CnfSlotEntity> {
  constructor(
    @InjectRepository(CnfSlotEntity)
    private repo: Repository<CnfSlotEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
