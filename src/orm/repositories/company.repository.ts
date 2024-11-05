import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyEmployeeEntity, CompanyEntity } from "../entities";

@Injectable()
export class CompanyRepository extends Repository<CompanyEntity> {
  constructor(
    @InjectRepository(CompanyEntity)
    private repo: Repository<CompanyEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByOwnerId(ownerId: number): Promise<CompanyEntity> {
    return await this.findOne({
      where: { owner_id: ownerId },
      relations: ['employee'], 
    });
  }

  async findById(id: number): Promise<CompanyEntity> {
    return await this.findOneBy({ id });
  }
}
