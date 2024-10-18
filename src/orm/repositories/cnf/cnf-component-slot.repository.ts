import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CnfComponentTypeEntity } from 'src/orm/entities/cnf/cnf-component-type.entity';
import { Repository } from 'typeorm';
import { CnfComponentSlotEntity } from "../../entities";

@Injectable()
export class CnfComponentSlotRepository extends Repository<CnfComponentSlotEntity> {
  constructor(
    @InjectRepository(CnfComponentSlotEntity)
    private repo: Repository<CnfComponentSlotEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
