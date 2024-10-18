import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CnfComponentEntity } from 'src/orm/entities/cnf/cnf-component.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CnfComponentRepository extends Repository<CnfComponentEntity> {
  constructor(
    @InjectRepository(CnfComponentEntity)
    private repo: Repository<CnfComponentEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
