import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThan, Repository } from "typeorm";
import { UserEntity } from "../entities/user.entity";
import { UserToken } from "../entities/user-token.entity";
import { hashSessionToken } from "../../utils/session-token";
import { isBuiltInSuperAdminEmail } from "@app/security/built-in-super-admin";

const BUILT_IN_ADMIN_MUTATION_ERROR =
  "Главного администратора нельзя удалить, отключить или лишить роли";

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
      relations: [
        'role',
        'role.permissions',
        'user_info',
        'company_employee',
        'company_employee.company',
        'user_roles',
        'user_roles.role',
        'user_roles.role.permissions',
      ]
    });
  }

  async findByIdWithPermissions(id: number) {
    return this.findOne({
      where: { id, deleted_at: null },
      relations: [
        'manager',
        'manager.user_info',
        'role',
        'role.permissions',
        'user_info',
        'company_employee',
        'company_employee.company',
        'user_roles',
        'user_roles.role',
        'user_roles.role.permissions',
      ]
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
        'company_employees.company',
        'user_roles',
        'user_roles.role',
        'user_roles.role.permissions'
      ]
    });
  }

  // ======== Стандартные CRUD ========
  public async find(options?: Parameters<Repository<UserEntity>["find"]>[0]) {
    return await this.repo.find(options);
  }

  public async softDelete(id: number) {
    await this.assertUserCanBeDeleted(id);
    return await this.repo.softDelete(id);
  }

  public async restore(id: number) {
    return await this.repo.restore(id);
  }

  public async delete(id: number) {
    await this.assertUserCanBeDeleted(id);
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
    await this.assertProtectedFieldsCanBeUpdated(id, data);
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
      relations: ["user_info", 'manager'],
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
      where: {
        token: hashSessionToken(token),
        revoked_at: IsNull(),
        expires_at: MoreThan(new Date()),
      },
      relations: ["user", 'user.manager'],
    });
    return userToken?.user || null;
  }

  public async findByEmailWithCompanyEmployees(email: string) {
    return await this.repo.findOne({
      where: { email },
      relations: ["company_employee", "user_info", 'manager'],
    });
  }

  public async findByIdWithCompanyEmployees(id: number) {
    return await this.repo.findOne({
      where: { id },
      relations: ["company_employee", "user_info", 'manager'],
    });
  }

  public async findByTokenWithCompanyEmployees(token: string) {
    const userToken = await this.userTokenRepository.findOne({
      where: {
        token: hashSessionToken(token),
        revoked_at: IsNull(),
        expires_at: MoreThan(new Date()),
      },
      relations: [
        "user",
        "user.role",
        "user.user_roles",
        "user.user_roles.role",
        "user.company_employee",
        "user.manager",
      ],
    });
    return userToken?.user || null;
  }

  public async findByTokenWithCompany(token: string): Promise<UserEntity> {
    const userToken = await this.userTokenRepository.findOne({
      where: {
        token: hashSessionToken(token),
        revoked_at: IsNull(),
        expires_at: MoreThan(new Date()),
      },
      relations: [
        "user",
        "user.role",
        "user.user_roles",
        "user.user_roles.role",
        "user.company_employee",
        "user.company_employee.company",
        "user.user_info",
        'user.manager'
      ],
    });
    return userToken?.user || null;
  }

  public async updateUser(id: number, data: Partial<UserEntity>) {
    await this.assertProtectedFieldsCanBeUpdated(id, data);
    return await this.repo.update(id, data);
  }

  private async assertUserCanBeDeleted(id: number): Promise<void> {
    const user = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (isBuiltInSuperAdminEmail(user?.email)) {
      throw new ForbiddenException(BUILT_IN_ADMIN_MUTATION_ERROR);
    }
  }

  private async assertProtectedFieldsCanBeUpdated(
    id: number,
    data: Partial<UserEntity>,
  ): Promise<void> {
    const changesProtectedIdentity =
      data.email !== undefined ||
      data.role_id !== undefined ||
      data.role !== undefined ||
      data.deleted_at !== undefined ||
      data.is_activated === false;

    if (!changesProtectedIdentity) return;

    const user = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (isBuiltInSuperAdminEmail(user?.email)) {
      throw new ForbiddenException(BUILT_IN_ADMIN_MUTATION_ERROR);
    }
  }
}
