// user.repository.ts

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../entities/user.entity";
import { UserToken } from "../entities/user-token.entity";

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,

    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) {}

  // методы для управления правами
  async findByEmailWithPermissions(email: string) {
    return this.findOne({
      where: { email, deleted_at: null },
      relations: ['role', 'role.permissions', 'user_info']
    });
  }

  async findByIdWithPermissions(id: number) {
    return this.findOne({
      where: { id, deleted_at: null },
      relations: ['role', 'role.permissions', 'user_info']
    });
  }

  async findByIdWithCompanyEmployeesAndPermissions(id: number) {
    return this.findOne({
      where: { id, deleted_at: null },
      relations: [
        'role', 
        'role.permissions', 
        'user_info', 
        'company_employees',
        'company_employees.company'
      ]
    });
  }

  // ======== Стандартные CRUD ========
  public async find(options?: Parameters<Repository<UserEntity>["find"]>[0]) {
    return await this.repo.find(options);
  }

  public async softDelete(id: number) {
    return await this.repo.softDelete(id);
  }

  public async restore(id: number) {
    return await this.repo.restore(id);
  }

  public async delete(id: number) {
    return await this.repo.delete(id);
  }

  public async findOne(
    options?: Parameters<Repository<UserEntity>["findOne"]>[0],
  ) {
    return await this.repo.findOne(options);
  }

  public async findOneBy(
    where: Parameters<Repository<UserEntity>["findOneBy"]>[0],
  ) {
    return await this.repo.findOneBy(where);
  }

  public async save(entity: UserEntity | Partial<UserEntity>) {
    return await this.repo.save(entity);
  }

  public async update(id: number, data: Partial<UserEntity>) {
    return await this.repo.update(id, data);
  }

  public createQueryBuilder(alias: string) {
    return this.repo.createQueryBuilder(alias);
  }

  // ======== Кастомные методы ========
  public async findAll(): Promise<UserEntity[]> {
    return await this.repo.find();
  }

  async findByIdWithUserInfo(id: number): Promise<UserEntity> {
    return await this.findOne({
      where: { id },
      relations: ["user_info", "owner_company"],
    });
  }

  public async findById(id: number): Promise<UserEntity> {
    return await this.repo.findOneBy({ id });
  }

  public async findByEmail(email: string): Promise<UserEntity> {
    return await this.repo.findOneBy({ email });
  }

  public async findByToken(token: string): Promise<UserEntity> {
    const userToken = await this.userTokenRepository.findOne({
      where: { token },
      relations: ["user"],
    });
    return userToken?.user || null;
  }

  public async findByEmailWithCompanyEmployees(email: string) {
    return await this.repo.findOne({
      where: { email },
      relations: ["company_employee", "user_info"],
    });
  }

  public async findByIdWithCompanyEmployees(id: number) {
    return await this.repo.findOne({
      where: { id },
      relations: ["company_employee", "user_info"],
    });
  }

  public async findByTokenWithCompanyEmployees(token: string) {
    const userToken = await this.userTokenRepository.findOne({
      where: { token },
      relations: ["user", "user.company_employee"],
    });
    return userToken?.user || null;
  }

  public async findByTokenWithCompany(token: string): Promise<UserEntity> {
    const userToken = await this.userTokenRepository.findOne({
      where: { token },
      relations: [
        "user",
        "user.company_employee",
        "user.company_employee.company",
        "user.user_info",
      ],
    });
    return userToken?.user || null;
  }

  public async updateUser(id: number, data: Partial<UserEntity>) {
    return await this.repo.update(id, data);
  }
}
