import { CreateAdminRequestDto } from "@api/admin/user/admin/dto/request/create-admin-request.dto";
import { SearchAdminDto } from "@api/admin/user/admin/dto/request/search-admin.dto";
import { UpdateAdminRequestDto } from "@api/admin/user/admin/dto/request/update-admin-request.dto";
import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { RoleTypes } from "@app/types/RoleTypes";
import { createCredentials } from "@app/utils/password";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { UserNotificationType, UserSettingType } from "@orm/entities";
import {
  RoleRepository,
  UserRepository,
  UserSettingRepository,
} from "@orm/repositories";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

const USER_EXISTS = "Пользователь с таким E-mail уже существует";

@Injectable()
export class AdminUserAdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private readonly roleRepository: RoleRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  async getCountsByAllRoles(): Promise<Record<string, number>> {
    const roles = await this.roleRepository.find();
    const counts: Record<string, number> = {};

    for (const role of roles) {
      counts[role.name] = await this.getCountByRole(role.name);
    }

    return counts;
  }

  async getCount(): Promise<number> {
    return await this.userRepository.createQueryBuilder("u").getCount();
  }

  async getCountByRole(role?: string): Promise<number> {
    let queryBuilder = this.userRepository.createQueryBuilder("u");
    queryBuilder.leftJoinAndMapOne("u.role", "roles", "r", "u.role_id = r.id");
    queryBuilder.leftJoin("user_roles", "ur", "u.id = ur.user_id");
    queryBuilder.leftJoin("roles", "r2", "ur.role_id = r2.id");

    if (role && role !== 'all') {
      queryBuilder.andWhere("(r.name = :name OR r2.name = :name)", { name: role });
    }

    return await queryBuilder.getCount();
  }

  async getArchivedCount(): Promise<number> {
    let queryBuilder = this.userRepository.createQueryBuilder("u");
    queryBuilder.withDeleted();
    queryBuilder.andWhere("u.deleted_at IS NOT NULL");
    return await queryBuilder.getCount();
  }

  async findAll(entry?: SearchAdminDto) {
    let queryBuilder = this.userRepository.createQueryBuilder("u");
    queryBuilder.leftJoinAndMapOne("u.role", "roles", "r", "u.role_id = r.id");
    queryBuilder.leftJoin("user_roles", "ur", "u.id = ur.user_id");
    queryBuilder.leftJoin("roles", "r2", "ur.role_id = r2.id");
    queryBuilder.leftJoinAndMapMany(
      "u.user_roles",
      "user_roles",
      "ur2",
      "u.id = ur2.user_id"
    );
    queryBuilder.leftJoinAndMapOne(
      "ur2.role",
      "roles",
      "r3",
      "ur2.role_id = r3.id"
    );
  
    if (entry?.role && entry.role !== 'all') {
      queryBuilder.andWhere("(r.name = :name OR r2.name = :name)", { name: entry.role });
    }
  
    if (entry?.archive === 'true') {
      queryBuilder.withDeleted();
      queryBuilder.andWhere("u.deleted_at IS NOT NULL");
    }
  
    return queryBuilder.getMany();
  }

  async create(data: CreateAdminRequestDto) {
    const isExist = await this.userRepository.findByEmail(data.email);

    if (isExist) throw new HttpException(USER_EXISTS, HttpStatus.FORBIDDEN);

    const { email, password: _password, role } = data;
    const roleSuperAdmin = await this.roleRepository.findOneBy({ name: role });

    const { salt, password } = await createCredentials(_password);
    const user = await this.userRepository.save({
      salt,
      email,
      password,
      role: roleSuperAdmin,
      is_activated: true,
      email_confirmed: true,
    });

    await this.userRoleRepository.save({
      user_id: user.id,
      role_id: roleSuperAdmin.id,
    });

    await this._createNotificationSettings(user.id);
    await this.emailConfirmerService.send({
      user_id: user.id,
      email: user.email,
      method: EmailConfirmerMethod.EmailConfirmation,
    });

    return user;
  }

  async update(id: number, data: UpdateAdminRequestDto) {
    const isUserAdmin = await this.userRepository.findById(id);

    if (!isUserAdmin) {
      throw new HttpException("Пользователь не найден!", HttpStatus.NOT_FOUND);
    }

    const { role } = data;
    const roleEntity = await this.roleRepository.findOneBy({ name: role });

    if (!roleEntity) {
      throw new HttpException("Роль не найдена!", HttpStatus.NOT_FOUND);
    }

    await this.userRepository.update(id, {
      role: roleEntity,
    });

    await this.userRoleRepository.delete({ user_id: id });

    await this.userRoleRepository.save({
      user_id: id,
      role_id: roleEntity.id,
    });

    return await this.userRepository.findById(id);
  }

  async delete(id: number): Promise<void> {
    const result = await this.userRepository.softDelete(id);

    if (result.affected === 0) {
      throw new HttpException(
        "Пользователь не найден или не был удален",
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async restore(id: number): Promise<object> {
    const result = await this.userRepository.restore(id);

    if (result.affected === 0) {
      throw new HttpException(
        "Пользователь не найден или уже восстановлен",
        HttpStatus.NOT_FOUND,
      );
    }

    return { success: true };
  }

  private async _createNotificationSettings(id: number) {
    await this.userSettingRepository.save([
      {
        user_id: id,
        type: UserSettingType.NOTIFICATIONS_WEB,
        value: UserNotificationType.Yes,
      },
      {
        user_id: id,
        type: UserSettingType.NOTIFICATIONS_EMAIL,
        value: UserNotificationType.Yes,
      },
    ]);
  }
}