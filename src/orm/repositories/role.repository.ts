import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from '../entities/role.entity';
import { RoleTypes } from "../../types/RoleTypes";

@Injectable()
export class RoleRepository extends Repository<RoleEntity> {
  constructor(
    @InjectRepository(RoleEntity)
    private repo: Repository<RoleEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async getSuperAdmin() {
    return await this.findByRole(RoleTypes.SuperAdmin);
  }
  public async getPartner() {
    return await this.findByRole(RoleTypes.Partner);
  }

  public async getEmployee() {
    return await this.findByRole(RoleTypes.Employee);
  }

  private async findByRole(role_name: RoleTypes) {
    return await this.findOne({
      where: { name: role_name },
    });
  }
}
