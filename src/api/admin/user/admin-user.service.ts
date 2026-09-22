import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { CompanyEmployeeRepository, UserRepository } from "@orm/repositories";
import {
  CompanyEmployeeEntity,
  CompanyEmployeeStatus,
  CompanyEntity,
  UserEntity,
  UserIdentityEntity,
  UserInfoEntity,
  UserToken,
} from "@orm/entities";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";
import { UpdateCompanyEmployeeRequestDto } from "./dto/request/update-company-employee.request.dto";
import { AllUserFilterRequestDto } from "./dto/request/all-user-filter.request.dto";
import { UpdateAnyUserRequestDto } from "./dto/request/update-any-user.request.dto";
import { DataSource } from "typeorm";
import { createCredentials } from "@app/utils/password";
import { randomBytes } from "crypto";
import {
  BUILT_IN_SUPER_ADMIN_EMAIL,
  isBuiltInSuperAdminEmail,
} from "@app/security/built-in-super-admin";

const defaultFilter = {
  limit: 10,
  page: 1,
};

@Injectable()
export class AdminUserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAllUsers(filters: AllUserFilterRequestDto) {
    const currentPage = filters.current_page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const query = this.userRepository
      .createQueryBuilder("user")
      .withDeleted()
      .leftJoinAndSelect("user.user_info", "user_info")
      .leftJoinAndSelect("user.role", "primary_role")
      .leftJoinAndSelect("user.user_roles", "user_roles")
      .leftJoinAndSelect("user_roles.role", "secondary_role")
      .leftJoinAndSelect("user.company_employee", "company_employee")
      .leftJoinAndSelect("company_employee.company", "employee_company")
      .leftJoinAndMapOne(
        "user.owner_company",
        "companies",
        "owner_company",
        "owner_company.owner_id = user.id",
      )
      .distinct(true);

    const deletionState = filters.deletion_state || "active";
    if (deletionState === "active") {
      query.andWhere("user.deleted_at IS NULL");
    } else if (deletionState === "deleted") {
      query.andWhere("user.deleted_at IS NOT NULL");
    }

    if (filters.search) {
      query.andWhere(
        "(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user_info.first_name) LIKE LOWER(:search) OR LOWER(user_info.last_name) LIKE LOWER(:search) OR LOWER(employee_company.name) LIKE LOWER(:search) OR LOWER(owner_company.name) LIKE LOWER(:search))",
        { search: `%${filters.search.trim()}%` },
      );
    }
    if (filters.role_name) {
      query.andWhere(
        "(primary_role.name = :roleName OR secondary_role.name = :roleName)",
        { roleName: filters.role_name },
      );
    }
    if (typeof filters.is_activated === "boolean") {
      query.andWhere("user.is_activated = :isActivated", {
        isActivated: filters.is_activated,
      });
    }

    const [users, total] = await query
      .orderBy("user.created_at", "DESC")
      .skip((currentPage - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      current_page: currentPage,
      limit,
      total,
      pages_count: Math.ceil(total / limit),
      data: users.map((user) => this.toSafeAdminUser(user)),
    };
  }

  async updateAnyUser(id: number, data: UpdateAnyUserRequestDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["user_info", "company_employee", "company_employee.company"],
      withDeleted: true,
    });
    if (!user || user.deleted_at) {
      throw new NotFoundException("Активный пользователь не найден");
    }

    const normalizedEmail = data.email?.trim().toLowerCase();
    const emailChanges =
      normalizedEmail !== undefined && normalizedEmail !== user.email.toLowerCase();
    if (
      isBuiltInSuperAdminEmail(user.email) &&
      (emailChanges || data.is_activated === false || data.email_confirmed === false)
    ) {
      throw new ForbiddenException(
        "Нельзя изменить идентичность или отключить главного администратора",
      );
    }

    if (normalizedEmail && emailChanges) {
      const existing = await this.userRepository.findOne({
        where: { email: normalizedEmail },
        withDeleted: true,
      });
      if (existing) throw new ConflictException("Пользователь с таким email уже существует");
    }

    const ownedCompany = await this.dataSource.getRepository(CompanyEntity).findOne({
      where: { owner_id: id },
    });
    if (
      data.company_id !== undefined &&
      ownedCompany &&
      data.company_id !== ownedCompany.id
    ) {
      throw new BadRequestException(
        "Нельзя изменить компанию владельца. Сначала передайте права владельца компании",
      );
    }

    if (data.company_id !== undefined && data.company_id !== null) {
      const companyExists = await this.dataSource
        .getRepository(CompanyEntity)
        .existsBy({ id: data.company_id });
      if (!companyExists) {
        throw new NotFoundException("Компания не найдена");
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const userPatch: Partial<UserEntity> = {};
      if (normalizedEmail !== undefined) userPatch.email = normalizedEmail;
      if (data.is_activated !== undefined) userPatch.is_activated = data.is_activated;
      if (data.email_confirmed !== undefined) userPatch.email_confirmed = data.email_confirmed;
      if (Object.keys(userPatch).length) {
        await manager.getRepository(UserEntity).update(id, userPatch);
      }

      const infoPatch = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        job_title: data.job_title,
      };
      const cleanInfoPatch = Object.fromEntries(
        Object.entries(infoPatch).filter(([, value]) => value !== undefined),
      );
      if (Object.keys(cleanInfoPatch).length) {
        const infoRepository = manager.getRepository(UserInfoEntity);
        if (user.user_info) {
          await infoRepository.update(user.user_info.id, cleanInfoPatch);
        } else {
          await infoRepository.save({
            user_id: id,
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            phone: data.phone || null,
            job_title: data.job_title || null,
          });
        }
      }

      if (data.company_id !== undefined && !ownedCompany) {
        const membershipRepository = manager.getRepository(CompanyEmployeeEntity);
        const memberships = await membershipRepository.find({
          where: { employee_id: id },
          order: { id: "ASC" },
        });
        if (memberships.length > 1) {
          throw new ConflictException(
            "У пользователя найдено несколько привязок к компаниям. Исправьте данные перед редактированием",
          );
        }

        if (data.company_id === null) {
          if (memberships.length) {
            await membershipRepository.remove(memberships);
          }
        } else if (memberships.length) {
          await membershipRepository.update(memberships[0].id, {
            company_id: data.company_id,
          });
        } else {
          await membershipRepository.save({
            company_id: data.company_id,
            employee_id: id,
            status: CompanyEmployeeStatus.Accept,
          });
        }
      }
    });

    const updated = await this.userRepository.findByIdWithPermissions(id);
    return this.toSafeAdminUser(updated);
  }

  async resetPassword(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user || user.deleted_at) {
      throw new NotFoundException("Активный пользователь не найден");
    }
    if (isBuiltInSuperAdminEmail(user.email)) {
      throw new ForbiddenException(
        "Пароль системного администратора нельзя сбросить",
      );
    }

    const temporaryPassword = randomBytes(12).toString("base64url");
    const credentials = await createCredentials(temporaryPassword);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UserEntity).update(id, {
        ...credentials,
        failed_login_attempts: 0,
        login_blocked_until: null,
      });
      await manager.getRepository(UserToken).delete({ user_id: id });
    });

    return {
      success: true,
      temporary_password: temporaryPassword,
      message: "Временный пароль создан. Он показывается только один раз.",
    };
  }

  async softDeleteAnyUser(id: number, actor: UserEntity) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) throw new NotFoundException("Пользователь не найден");
    if (user.deleted_at) {
      throw new BadRequestException("Пользователь уже удалён");
    }
    this.assertDeletionTargetAllowed(user, actor);

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UserToken).delete({ user_id: id });
      await manager.getRepository(UserEntity).softDelete(id);
    });

    return { success: true, message: "Пользователь перемещён в архив" };
  }

  async restoreAnyUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) throw new NotFoundException("Пользователь не найден");
    if (!user.deleted_at) {
      throw new BadRequestException("Пользователь не находится в архиве");
    }

    const result = await this.dataSource
      .getRepository(UserEntity)
      .restore(id);
    if (!result.affected) throw new NotFoundException("Пользователь не найден");

    return { success: true, message: "Пользователь восстановлен" };
  }

  async permanentlyDeleteAnyUser(id: number, actor: UserEntity) {
    if (!isBuiltInSuperAdminEmail(actor?.email)) {
      throw new ForbiddenException(
        `Физическое удаление доступно только ${BUILT_IN_SUPER_ADMIN_EMAIL}`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["user_info", "role", "user_roles", "user_roles.role"],
      withDeleted: true,
    });
    if (!user) throw new NotFoundException("Пользователь не найден");
    this.assertDeletionTargetAllowed(user, actor);
    if (!user.deleted_at) {
      throw new BadRequestException(
        "Перед физическим удалением переместите пользователя в архив",
      );
    }

    const roles = new Map<string, { id?: number; name: string; display_name?: string }>();
    if (user.role) roles.set(user.role.name, user.role);
    for (const userRole of user.user_roles || []) {
      if (userRole.role) roles.set(userRole.role.name, userRole.role);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UserIdentityEntity).update(id, {
        email: user.email,
        first_name: user.user_info?.first_name || null,
        last_name: user.user_info?.last_name || null,
        phone: user.user_info?.phone || null,
        job_title: user.user_info?.job_title || null,
        roles_snapshot: Array.from(roles.values()).map((role) => ({
          id: role.id,
          name: role.name,
          display_name: role.display_name,
        })),
        permanently_deleted_at: new Date(),
        deleted_by_user_id: actor.id,
        deleted_by_email: actor.email,
      });

      // Operational assignments must be released. Historical ownership and
      // authorship keep the same numeric ID, now backed by user_identities.
      await manager.query(
        "UPDATE companies SET responsible_manager_id = NULL WHERE responsible_manager_id = ?",
        [id],
      );
      await manager.query(
        `UPDATE companies
         SET review_locked_by_user_id = NULL,
             review_locked_at = NULL,
             review_lock_reason = NULL
         WHERE review_locked_by_user_id = ?`,
        [id],
      );
      await manager.query(
        "UPDATE deals SET responsible_manager_id = NULL WHERE responsible_manager_id = ?",
        [id],
      );
      await manager.query(
        "UPDATE tickets SET assignee_id = NULL WHERE assignee_id = ?",
        [id],
      );
      await manager.query(
        "UPDATE company_employees SET status = ? WHERE employee_id = ?",
        [CompanyEmployeeStatus.Deleted, id],
      );

      const result = await manager.getRepository(UserEntity).delete(id);
      if (!result.affected) throw new NotFoundException("Пользователь не найден");
    });

    return {
      success: true,
      message: "Аккаунт физически удалён, исторические данные сохранены",
    };
  }

  async getCount(): Promise<number> {
    return this.companyEmployeeRepository
      .createQueryBuilder("ce")
      .innerJoin("ce.company", "company")
      .where("company.owner_id <> ce.employee_id")
      .getCount();
  }

  async find(filters: UserFilterRequestDto) {
    const current_page = filters.current_page || 1;
    const limit = filters.limit || defaultFilter.limit;
    const skip = (current_page - 1) * limit;

    const qb = this.companyEmployeeRepository.createQueryBuilder("ce");
    qb.innerJoinAndSelect("ce.employee", "employee")
      .innerJoinAndSelect("ce.company", "company")
      .leftJoinAndSelect("employee.user_info", "user_info")
      .leftJoinAndSelect("employee.role", "primary_role")
      .leftJoinAndSelect("employee.user_roles", "user_roles")
      .leftJoinAndSelect("user_roles.role", "secondary_role")
      .where("company.owner_id <> ce.employee_id")
      .distinct(true);

    if (filters.role_name) {
      qb.andWhere(
        "(primary_role.name = :role_name OR secondary_role.name = :role_name)",
        { role_name: filters.role_name },
      );
    }

    if (typeof filters.is_activated === "boolean") {
      qb.andWhere("employee.is_activated = :is_activated", {
        is_activated: filters.is_activated,
      });
    }

    if (filters.search) {
      qb.andWhere(
        "(LOWER(employee.email) LIKE LOWER(:search) OR LOWER(user_info.first_name) LIKE LOWER(:search) OR LOWER(user_info.last_name) LIKE LOWER(:search) OR LOWER(company.name) LIKE LOWER(:search))",
        { search: `%${filters.search}%` },
      );
    }

    if (filters.company_id) {
      qb.andWhere("ce.company_id = :company_id", { company_id: filters.company_id });
    }

    if (filters.status) {
      qb.andWhere("ce.status = :status", { status: filters.status });
    }

    const [data, total] = await qb
      .orderBy("ce.created_at", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      current_page,
      limit,
      total,
      pages_count: Math.ceil(total / limit),
      data,
    };
  }

  async restoreCompanyEmployee(id: number) {
    const user = await this.userRepository.findByIdWithCompanyEmployees(id);
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }

    const companyEmployee =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(id);
    if (!companyEmployee) {
      throw new HttpException(
        "Пользователь не привязан к компании",
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      ![
        CompanyEmployeeStatus.Blocked,
        CompanyEmployeeStatus.Deleted,
      ].includes(companyEmployee.status)
    ) {
      throw new BadRequestException(
        `Нельзя восстановить сотрудника из статуса ${companyEmployee.status}`,
      );
    }

    await this.companyEmployeeRepository.update(companyEmployee.id, {
      status: CompanyEmployeeStatus.Accept,
    });
    await this.userRepository.update(id, { is_activated: true });

    return {
      success: true,
      message: "Сотрудник восстановлен",
      employee:
        await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
          id,
        ),
    };
  }

  async updateCompanyEmployee(
    id: number,
    data: UpdateCompanyEmployeeRequestDto,
  ) {
    const companyEmployee =
      await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(id);
    if (!companyEmployee) {
      throw new HttpException(
        "Сотрудник компании не найден",
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      typeof data.is_activated !== "boolean" &&
      typeof data.email_confirmed !== "boolean"
    ) {
      throw new BadRequestException("Не переданы поля для обновления");
    }

    const update: UpdateCompanyEmployeeRequestDto = {};
    if (typeof data.is_activated === "boolean") {
      update.is_activated = data.is_activated;
    }
    if (typeof data.email_confirmed === "boolean") {
      update.email_confirmed = data.email_confirmed;
    }

    await this.userRepository.update(id, update);

    return {
      success: true,
      message: "Сотрудник обновлён",
      employee:
        await this.companyEmployeeRepository.findCompanyEmployeeByEmployeeId(
          id,
        ),
    };
  }

  private toSafeAdminUser(user: UserEntity) {
    const roles = new Map<string, any>();
    if (user.role) roles.set(user.role.name, user.role);
    for (const userRole of user.user_roles || []) {
      if (userRole.role) roles.set(userRole.role.name, userRole.role);
    }
    return {
      id: user.id,
      email: user.email,
      is_activated: user.is_activated,
      email_confirmed: user.email_confirmed,
      created_at: user.created_at,
      updated_at: user.updated_at,
      deleted_at: user.deleted_at,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            display_name: user.role.display_name,
          }
        : null,
      roles: Array.from(roles.values()).map((role) => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
      })),
      user_info: user.user_info
        ? {
            first_name: user.user_info.first_name,
            last_name: user.user_info.last_name,
            phone: user.user_info.phone,
            job_title: user.user_info.job_title,
          }
        : null,
      company:
        user.owner_company ||
        user.company_employee?.company ||
        null,
      company_relation_type: user.owner_company
        ? "owner"
        : user.company_employee
          ? "employee"
          : null,
      company_employee_status: user.company_employee?.status || null,
      lastActivity: user.lastActivity,
    };
  }

  private assertDeletionTargetAllowed(user: UserEntity, actor: UserEntity) {
    if (isBuiltInSuperAdminEmail(user.email)) {
      throw new ForbiddenException("Главного администратора нельзя удалить");
    }
    if (actor?.id === user.id) {
      throw new ForbiddenException("Нельзя удалить собственный аккаунт");
    }
  }
}
