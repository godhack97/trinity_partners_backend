import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { CompanyEmployeeRepository, UserRepository } from "@orm/repositories";
import { CompanyEmployeeStatus, UserEntity, UserInfoEntity, UserToken } from "@orm/entities";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";
import { UpdateCompanyEmployeeRequestDto } from "./dto/request/update-company-employee.request.dto";
import { AllUserFilterRequestDto } from "./dto/request/all-user-filter.request.dto";
import { UpdateAnyUserRequestDto } from "./dto/request/update-any-user.request.dto";
import { DataSource } from "typeorm";
import { createCredentials } from "@app/utils/password";
import { randomBytes } from "crypto";

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
      relations: ["user_info"],
      withDeleted: true,
    });
    if (!user || user.deleted_at) {
      throw new NotFoundException("Активный пользователь не найден");
    }

    if (data.email && data.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.userRepository.findOne({
        where: { email: data.email.trim().toLowerCase() },
        withDeleted: true,
      });
      if (existing) throw new ConflictException("Пользователь с таким email уже существует");
    }

    await this.dataSource.transaction(async (manager) => {
      const userPatch: Partial<UserEntity> = {};
      if (data.email !== undefined) userPatch.email = data.email.trim().toLowerCase();
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
      lastActivity: user.lastActivity,
    };
  }
}
