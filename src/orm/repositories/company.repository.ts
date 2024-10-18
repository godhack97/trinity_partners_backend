import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyEntity } from "../entities";

@Injectable()
export class CompanyRepository extends Repository<CompanyEntity> {
  constructor(
    @InjectRepository(CompanyEntity)
    private repo: Repository<CompanyEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
