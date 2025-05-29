import { CreateAdminRequestDto } from "@api/admin/user/admin/dto/request/create-admin-request.dto";
import { SearchAdminDto } from "@api/admin/user/admin/dto/request/search-admin.dto";
import { UpdateAdminRequestDto } from "@api/admin/user/admin/dto/request/update-admin-request.dto";
import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { RoleTypes } from "@app/types/RoleTypes";
import { createCredentials } from "@app/utils/password";
import {
  HttpException,
  HttpStatus,
  Injectable
} from '@nestjs/common';
import {
  UserNotificationType,
  UserSettingType
} from "@orm/entities";
import {
  RoleRepository,
  UserRepository,
  UserSettingRepository
} from "@orm/repositories";

const USER_EXISTS = 'Пользователь с таким E-mail уже существует'

export enum SearchRoleAdminTypes {
  SuperAdmin = RoleTypes.SuperAdmin,
  ContentManager = RoleTypes.ContentManager,
  ALL = 'all'
}

export enum RoleAdminTypes {
  SuperAdmin = RoleTypes.SuperAdmin,
  ContentManager = RoleTypes.ContentManager
}
@Injectable()
export class AdminUserAdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private readonly roleRepository: RoleRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
  ) {}

  allowed_roles =  [
    RoleTypes.SuperAdmin,
    RoleTypes.ContentManager
  ]

  async findAll(entry?: SearchAdminDto) {
    let queryBuilder = this.userRepository.createQueryBuilder("u");
    queryBuilder.leftJoinAndMapOne('u.role', 'roles', 'r', 'u.role_id = r.id');
  
    switch (entry?.role) {
      case SearchRoleAdminTypes.SuperAdmin:
      case SearchRoleAdminTypes.ContentManager:
        queryBuilder.andWhere("r.name = :name", { name: entry.role });
        break;
      case SearchRoleAdminTypes.ALL:
      default:
        queryBuilder.andWhere("r.name IN (:...name)", { name: this.allowed_roles });
    }
  
    // Фильтрация по archive (deleted_at)
    if (entry?.archive === true) {
      queryBuilder.withDeleted();
      queryBuilder.andWhere("u.deleted_at IS NOT NULL");
    }

    return queryBuilder.getMany();
  }

  async create(data: CreateAdminRequestDto)  {
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

    await this._createNotificationSettings(user.id)
    await this.emailConfirmerService.send({
      user_id: user.id,
      email: user.email,
      method: EmailConfirmerMethod.EmailConfirmation
    })

    return user
  }

  async update(id: number, data: UpdateAdminRequestDto) {

    const isUserAdmin = await this.userRepository.findById(id);

    if (!this.allowed_roles.includes(isUserAdmin.role.name as RoleTypes)) {
      throw new HttpException('Это не администратор!', HttpStatus.FORBIDDEN);
    }

    const { role } = data;

    const roleSuperAdmin = await this.roleRepository.findOneBy({ name: role });

    await this.userRepository.update(id, {
      role: roleSuperAdmin,
    });

    return await this.userRepository.findById(id);
  }

  // фиктивно удаляем (soft-delete)
  async delete(id: number): Promise<void> {
    const result = await this.userRepository.softDelete(id);

    if (result.affected === 0) {
      throw new HttpException('Пользователь не найден или не был удален', HttpStatus.NOT_FOUND);
    }
  }

  // восстанавливаем, если фиктивно удалили
  async restore(id: number): Promise<object> {
    const result = await this.userRepository.restore(id);

    if (result.affected === 0) {
      throw new HttpException('Пользователь не найден или уже восстановлен', HttpStatus.NOT_FOUND);
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
      }
    ])
  }
}
