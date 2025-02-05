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

const USER_EXISTS = 'Пользователь с такой почтой уже существует'

@Injectable()
export class AdminUserAdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private readonly roleRepository: RoleRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
  ) {}

  async findAll(entry?: SearchAdminDto) {
    const role_names =  [
      RoleTypes.SuperAdmin,
      RoleTypes.ContentManager
    ]
    let queryBuilder = this.userRepository.createQueryBuilder("u");
    queryBuilder.leftJoinAndMapOne('u.role', 'roles', 'r',  'u.role_id = r.id')

    if(entry.role) {
      queryBuilder.andWhere("r.name = :name", { name: entry.role });
    } else {
      queryBuilder.andWhere("r.name IN (:...name)", { name: role_names });
    }

    return queryBuilder.getMany()
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
    const isExistEmail = await this.userRepository.findByEmail(data.email);

    if (isExistEmail.id !== id) throw new HttpException(USER_EXISTS, HttpStatus.FORBIDDEN);

    const { email, password: _password, role } = data;
    const roleSuperAdmin = await this.roleRepository.findOneBy({ name: role });

    const { salt, password } = await createCredentials(_password);

    return await this.userRepository.update(id, {
      salt,
      email,
      password,
      role: roleSuperAdmin,
    });
  }

  async delete(id: number) {
    const deleteResult =  await this.userRepository.delete(id);

    if (deleteResult.affected === 0) {
      throw new HttpException('Не удалось удалить', HttpStatus.INTERNAL_SERVER_ERROR);
    }

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
