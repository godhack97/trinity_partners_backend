import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CnfServerEntity } from 'src/orm/entities/cnf/cnf-server.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CnfServerRepository extends Repository<CnfServerEntity> {
  constructor(
    @InjectRepository(CnfServerEntity)
    private repo: Repository<CnfServerEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
