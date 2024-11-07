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

  public async findCompanyEmployeeByEmployeeId(employee_id: number) {
    return await this.findOneBy({ employee_id });
  }

  public async findAllCompanyEmployeesWithUsersAndInfo() {
    return await this.repo.find({
      relations: ['employee', 'employee.user_info'],
    });
  }
    
  public async findCompanyEmployeesByCompanyId(company_id: number) {
    return await this.repo.find({
      where: { company_id },
      relations: ['employee', 'employee.user_info'],
    });
  }
}