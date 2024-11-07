import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyEmployeeEntity } from "../entities";

@Injectable()
export class CompanyEmployeeRepository extends Repository<CompanyEmployeeEntity> {
  constructor(
    @InjectRepository(CompanyEmployeeEntity)
    private repo: Repository<CompanyEmployeeEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
