import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    private repo: Repository<UserEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findAll(): Promise<UserEntity[]> {
    return await this.find();
  }

  public async findById(id: number): Promise<UserEntity> {
    return await this.findOneBy({ id });
  }

  public async findByEmail(email: string): Promise<UserEntity> {
    return await this.findOneBy({ email });
  }

  public async findByToken(token: string): Promise<UserEntity> {
    return await this.findOneBy({ token });
  }

  public async findByPassword(password: string): Promise<UserEntity> {
    return await this.findOneBy({ password });
  }

  public async findByEmailWithCompanyEmployees(email: string) {
    return await this.findOne({
      where: { email },
      relations: ['company_employee', 'user_info']
    });
  }

  public async findByTokenWithCompanyEmployees(token: string) {
    return await this.findOne({
      where: { token },
      relations: ['company_employee']
    });
  }

  public async findByIdWithCompanyEmployees(id: number) {
    return await this.findOne({
      where: { id },
      relations: ['company_employee', 'user_info']
    });
  }
}
