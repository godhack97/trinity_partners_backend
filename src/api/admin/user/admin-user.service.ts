import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { CompanyEmployeeRepository, UserRepository } from "@orm/repositories";
import { CompanyEmployeeStatus } from "@orm/entities";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";

const defaultFilter = {
  limit: 10,
  page: 1,
};

@Injectable()
export class AdminUserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
  ) {}

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
}
