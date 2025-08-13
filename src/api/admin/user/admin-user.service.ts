import { Injectable } from "@nestjs/common";
import { UserRepository } from "@orm/repositories";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";
const defaultFilter = {
  limit: 10,
  page: 1,
};
@Injectable()
export class AdminUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async find(filters: UserFilterRequestDto) {
    const current_page = filters.current_page || 1;
    const limit = filters.limit || defaultFilter.limit;
    const skip = (current_page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder("u");
    qb.leftJoinAndMapOne("u.role", "roles", "r", "u.role_id = r.id")
      .leftJoin("company_employees", "ce", "ce.employee_id = u.id")
      .leftJoinAndMapOne("u.company", "companies", "c", "c.id = ce.company_id");

    if (filters.role_name) {
      qb.andWhere("r.name = :name", { name: filters.role_name });
    }

    if (filters.is_activated) {
      qb.andWhere("u.is_activated", { is_activated: filters.is_activated });
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
}
