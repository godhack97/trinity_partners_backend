import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CnfServerSlotEntity } from 'src/orm/entities/cnf/cnf-server-slot.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CnfServerSlotRepository extends Repository<CnfServerSlotEntity> {
  constructor(
    @InjectRepository(CnfServerSlotEntity)
    private repo: Repository<CnfServerSlotEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
