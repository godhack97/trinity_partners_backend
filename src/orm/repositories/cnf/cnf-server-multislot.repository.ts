import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CnfServerMultislotEntity } from "../../entities";

@Injectable()
export class CnfServerMultislotRepository extends Repository<CnfServerMultislotEntity> {
  constructor(
    @InjectRepository(CnfServerMultislotEntity)
    private repo: Repository<CnfServerMultislotEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
