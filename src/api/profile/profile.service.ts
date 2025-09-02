import { ProfileEmployeeRequestDto } from "@api/profile/dto/request/profile-employee.request.dto";
import { ProfilePartnerRequestDto } from "@api/profile/dto/request/profile-partner.request.dto";
import { ProfileUpdateEmailRequestDto } from "@api/profile/dto/request/profile-update-email.request.dto";
import { ProfileUpdateSettingsRequestDto } from "@api/profile/dto/request/profile-update-settings.request.dto";
import { ProfileUpdateRequestDto } from "@api/profile/dto/request/profile-update.request.dto";
import { ProfileUpdatePasswordRequestDto } from "@api/profile/dto/request/profile-update-password.request.dto";
import { RoleTypes } from "@app/types/RoleTypes";
import { createPassword, verifyPassword } from "@app/utils/password";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InternalServerErrorException } from "@nestjs/common/exceptions/internal-server-error.exception";
import { UserEntity, UserSettingType } from "@orm/entities";
import {
  CompanyRepository,
  NotificationRepository,
  UserInfoRepository,
  UserRepository,
} from "@orm/repositories";
import { UserSettingRepository } from "@orm/repositories/user-setting.repository";

const USER_NOT_EXISTS = "Пользователь не найден";
const EMAIl_EXISTS = (email) => `Такой email: ${email} уже существует`;

@Injectable()
export class ProfileService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userInfoRepository: UserInfoRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  action = {
    update: {
      [RoleTypes.Partner]: this.updatePartner.bind(this),
      [RoleTypes.Employee]: this.updateEmployee.bind(this),
      [RoleTypes.SuperAdmin]: this.updateEmployee.bind(this),
      [RoleTypes.EmployeeAdmin]: this.updateEmployee.bind(this),
      [RoleTypes.ContentManager]: this.updateEmployee.bind(this),
    },
  };

  async getProfile(auth_user: Partial<UserEntity>) {
    const user = await this.userRepository.findById(auth_user.id);

    return user;
  }
  async update(auth_user: Partial<UserEntity>, data: ProfileUpdateRequestDto) {
    const user = await this.userRepository.findById(auth_user.id);

    if (this.action.update[user.role.name]) {
      return this.action.update[user.role.name](user, data);
    }

    throw new InternalServerErrorException(
      "Недостаточно прав для " + user.role.name,
    );
  }

  async updateSettings(
    auth_user: Partial<UserEntity>,
    data: ProfileUpdateSettingsRequestDto,
  ) {
    const user = await this.userRepository.findById(auth_user.id);
    const userSettingTypes = Object.entries(UserSettingType).map(([k, v]) => v);

    for (const [k, v] of Object.entries(data)) {
      if (!userSettingTypes.includes(k)) {
        throw new HttpException(
          `Неверный параметр: ${k}`,
          HttpStatus.FORBIDDEN,
        );
      }
      if (v === undefined || v === null) continue;

      const settingFind = await this.userSettingRepository.findOneBy({
        user_id: user.id,
        type: k,
      });
      const partialEntity = {
        user_id: user.id,
        type: k,
        value: v,
      };
      if (settingFind) {
        await this.userSettingRepository.update(settingFind.id, partialEntity);
      } else {
        await this.userSettingRepository.save(partialEntity);
      }
    }
  }

  private async _updateInfo(user: UserEntity, data: ProfileEmployeeRequestDto) {
    const params: Partial<ProfileEmployeeRequestDto> = {
      job_title: data.job_title,
      phone: data.phone,
      photo_url: !!data.photo_url ? data.photo_url : "",
    };

    const updateResult = await this.userInfoRepository.update(
      user.user_info.id,
      params,
    );

    if (updateResult.affected === 0)
      throw new InternalServerErrorException("Не удалось обновить");
  }

  private async updateEmployee(
    user: UserEntity,
    data: ProfileEmployeeRequestDto,
  ) {
    await this._updateInfo(user, data);
  }

  private async updatePartner(
    user: UserEntity,
    data: ProfilePartnerRequestDto,
  ) {
    await this._updateInfo(user, data);

    const company = await this.companyRepository.findOneBy({
      owner_id: user.id,
    });

    const updateResultCompany = await this.companyRepository.update(
      company.id,
      {
        company_business_line: data.company_business_line,
        employees_count: data.employees_count,
        site_url: data.site_url,
        promoted_products: data.promoted_products,
        products_of_interest: data.products_of_interest,
        main_customers: data.main_customers,
      },
    );

    if (updateResultCompany.affected === 0)
      throw new InternalServerErrorException("Не удалось обновить");
  }

  async updateEmail(id: number, data: ProfileUpdateEmailRequestDto) {
    const { email } = data;
    const user = await this.userRepository.findByEmail(email);

    if (user) {
      throw new HttpException(EMAIl_EXISTS(email), HttpStatus.FORBIDDEN);
    }

    return await this.userRepository.update(id, {
      email,
    });
  }

  async updatePassword(id: number, data: ProfileUpdatePasswordRequestDto) {
    const user = await this.userRepository.findById(id);

    if (!user) throw new HttpException(USER_NOT_EXISTS, HttpStatus.FORBIDDEN);

    const isVerify = await verifyPassword({
      user_password: user.password,
      password: data.passwordPrev,
      salt: user.salt,
    });

    if (!isVerify)
      throw new HttpException("Неверный старый пароль", HttpStatus.FORBIDDEN);

    if (data.passwordPrev === data.passwordNew)
      throw new HttpException(
        "Старый пароль не должен совпадать с новым",
        HttpStatus.FORBIDDEN,
      );

    if (!(data.passwordNew === data.passwordNew2))
      throw new HttpException("Пароли не совпадают", HttpStatus.FORBIDDEN);

    const passwordHashed = await createPassword({
      password: data.passwordNew,
      salt: user.salt,
    });

    await this.userRepository.update(id, { password: passwordHashed });
  }

  async getNotifications(id: number) {
    return this.notificationRepository.findBy({
      user_id: id,
    });
  }
}
