import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
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

  async find(filters: UserFilterRequestDto) {
    const current_page = filters.current_page || 1;
    const limit = filters.limit || defaultFilter.limit;
    const skip = (current_page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder("u");
    qb.leftJoinAndMapOne("u.role", "roles", "r", "u.role_id = r.id")
      .leftJoin("user_roles", "ur", "u.id = ur.user_id")
      .leftJoin("roles", "r2", "ur.role_id = r2.id")
      .leftJoin("company_employees", "ce", "ce.employee_id = u.id")
      .leftJoinAndMapOne("u.company", "companies", "c", "c.id = ce.company_id");

    if (filters.role_name) {
      qb.andWhere("(r.name = :name OR r2.name = :name)", { name: filters.role_name });
    }

    if (filters.is_activated) {
      qb.andWhere("u.is_activated = :is_activated", { is_activated: filters.is_activated });
    }

    if (filters.email) {
      qb.andWhere("u.email like :email", { email: `${filters.email}%` });
    }

    if (filters.company_id) {
      qb.andWhere("ce.company_id = :company_id", {
        company_id: filters.company_id,
      });
    }

    const data = await qb.skip(skip).take(limit).withDeleted().getMany();
    const total = await qb.getCount();
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

    if (companyEmployee.status === CompanyEmployeeStatus.Accept) {
      return {
        success: true,
        message: "Сотрудник уже активен",
        employee: companyEmployee,
      };
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
