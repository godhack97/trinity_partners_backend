import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { UserEntity } from "../../orm/entities/user.entity";
import { UserRepository } from "@orm/repositories";
import { UserFilterRequestDto } from "./dto/request/user-filter-request.dto";

const defaultFilter = {
  limit: 10,
  page: 1,
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly userRepository: UserRepository,
  ) {}

  async getCount(): Promise<number> {
    return await this.usersRepository.createQueryBuilder().getCount();
  }

  async findUsersByRoleIdGreaterThanOne(): Promise<UserEntity[]> {
    const qb = this.usersRepository.createQueryBuilder("u");
    qb.leftJoin("user_roles", "ur", "u.id = ur.user_id")
      .leftJoin("roles", "r", "ur.role_id = r.id")
      .leftJoin("roles", "r2", "u.role_id = r2.id")
      .where("(u.role_id > 1 OR r.id > 1)")
      .select([
        "u.id",
        "u.email",
        "u.role_id",
        "u.is_activated",
        "u.email_confirmed",
        "u.lastActivity",
      ]);

    const users = await qb.getMany();

    if (!users.length) {
      throw new NotFoundException("No users found with role_id > 1");
    }

    return users;
  }

  async findAll(filters?: UserFilterRequestDto) {
    const current_page = filters?.current_page || 1;
    const limit = filters?.limit || 0;
    const skip = (current_page - 1) * limit;

    const qb = this.usersRepository.createQueryBuilder("u")
      .leftJoinAndSelect("u.user_info", "user_info")
      .leftJoinAndSelect("u.role", "role")
      .leftJoinAndSelect("u.user_roles", "user_roles")
      .leftJoinAndSelect("user_roles.role", "ur_role");

    if (filters?.search) {
      qb.andWhere(
        "(LOWER(u.email) LIKE LOWER(:search) OR LOWER(user_info.first_name) LIKE LOWER(:search) OR LOWER(user_info.last_name) LIKE LOWER(:search))",
        { search: `%${filters.search}%` }
      );
    }

    const [data, total] = await qb
      .orderBy("u.id", "ASC")
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
  async findByEmail(filters: UserFilterRequestDto) {
    console.log(filters);

    const qb = this.userRepository.createQueryBuilder("u");
    qb.leftJoinAndMapOne("u.role", "roles", "r", "u.role_id = r.id")
      .leftJoin("user_roles", "ur", "u.id = ur.user_id")
      .leftJoinAndSelect("u.user_info", "user_info")
      .leftJoin("roles", "r2", "ur.role_id = r2.id")
      .leftJoin("company_employees", "ce", "ce.employee_id = u.id")
      .leftJoinAndMapOne("u.company", "companies", "c", "c.id = ce.company_id");

    if (filters.role_name) {
      qb.andWhere("(r.name = :name OR r2.name = :name)", { name: filters.role_name });
    }

    if (typeof filters.is_activated === "boolean") {
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

    return await qb.withDeleted().getOne();
  }

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

    if (typeof filters.is_activated === "boolean") {
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
}