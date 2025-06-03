import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { UserSettingRepository } from "@orm/repositories/user-setting.repository";
import { UserToken } from 'src/orm/entities/user-token.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { emailSendConfig } from "@api/email-confirmer/config";


import {
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { CompanyRepository } from 'src/orm/repositories/company.repository';
import { RoleRepository } from 'src/orm/repositories/role.repository';
import { UserInfoRepository } from 'src/orm/repositories/user-info.repository';
import { UserRepository } from 'src/orm/repositories/user.repository';
import {
  createCredentials,
  createToken,
} from 'src/utils/password';
import { RegistrationEmployeeRequestDto } from '../registration/dto/request/registration-employee.request.dto';
import { RegistrationCompanyRequestDto } from '../registration/dto/request/registration-company.request.dto';
import { CompanyEmployeeRepository } from "@orm/repositories";
import {
  CompanyEmployeeStatus,
  CompanyStatus,
  UserNotificationType,
  UserSettingType
} from "@orm/entities";
import {
  RegistrationSuperAdminDto,
  RegistrationSuperAdminWithSecretDto
} from "../registration/dto/request/registration-super-admin.request.dto";

const USER_SECRET = 'Неправильно введен СЕКРЕТ';
const USER_EXISTS = 'Пользователь с таким E-mail уже существует';
const USER_PHONE_EXISTS = 'Пользователь с таким телефоном уже существует';
const INN_EXISTS = 'Пользователь с таким ИНН уже существует';
//Можно перенести в .env
const SECRET_KEY = 'askhl32423ksajdhgfa!!dsfljnfla232fsafsdnn!21412'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userInfoRepository: UserInfoRepository,
    private readonly roleRepository: RoleRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) {}

  async createEmployee(
    registrationEmployeeDto: RegistrationEmployeeRequestDto,
  ) {
    const user = await this.userRepository.findByEmail(
      registrationEmployeeDto.email,
    );

    if (user) throw new BadRequestException(USER_EXISTS);

    const isUserPhone = await this.userInfoRepository.findOneBy({
      phone: registrationEmployeeDto.phone,
    });

    if (isUserPhone) throw new BadRequestException(USER_PHONE_EXISTS);

    const roleEmployee = await this.roleRepository.getEmployee();
    const { email, password: _password } = registrationEmployeeDto;
    const { salt, password } = await createCredentials(_password);

    const newUser = await this.userRepository.save({
      salt,
      email,
      password,
      role: roleEmployee,
    });

    await this._createNotificationSettings(newUser.id)

    await this.userInfoRepository.save({
      first_name: registrationEmployeeDto.first_name,
      last_name: registrationEmployeeDto.last_name,
      job_title: registrationEmployeeDto.job_title,
      phone: registrationEmployeeDto.phone,
      user: newUser,
    });

    await this.companyEmployeeRepository.save({
      company_id: null,
      employee_id: newUser.id,
      status: CompanyEmployeeStatus.Pending,
    })

    await this.emailConfirmerService.send({
      user_id: newUser.id,
      email: newUser.email,
      method: EmailConfirmerMethod.EmailConfirmation
    })
    return newUser;
  }

  private async notifySuperAdminsAboutNewPartner({
    company_name,
    first_name,
    last_name,
    email,
  }: {
    company_name?: string,
    first_name?: string,
    last_name?: string,
    email: string,
  }) {
    const superAdmins = await this.userRepository.find({
      where: { role_id: 1 },
    });
  
    // Автоматически определяем имя партнёра
    const partnerName = company_name
      || [first_name, last_name].filter(Boolean).join(' ')
      || 'Партнёр';
    const partnerEmail = email;
  
    for (const admin of superAdmins) {
      await this.emailConfirmerService.emailSend({
        email: admin.email,
        subject: emailSendConfig({ partnerName, partnerEmail })['notify.new.partner'].subject,
        template: emailSendConfig({ partnerName, partnerEmail })['notify.new.partner'].template,
        context: {
          partnerName,
          partnerEmail,
          link: 'https://partner.trinity.ru/',
        }
      });
    }
  }

  async createCompany(
    registrationCompanyDto: RegistrationCompanyRequestDto,
  ) {
    const user = await this.userRepository.findByEmail(
      registrationCompanyDto.email,
    );

    if (user) throw new BadRequestException(USER_EXISTS);

    const isUserPhone = await this.userInfoRepository.findOneBy({
      phone: registrationCompanyDto.phone,
    });

    if (isUserPhone) throw new BadRequestException(USER_PHONE_EXISTS);

    const isExistInn = await this.companyRepository.findOneBy({
      inn: registrationCompanyDto.inn,
    });

    if (isExistInn) throw new BadRequestException(INN_EXISTS);

    const { email, password: _password } = registrationCompanyDto;
    const rolePartner = await this.roleRepository.getPartner();

    const { salt, password } = await createCredentials(_password);

    const newUser = await this.userRepository.save({
      salt,
      email,
      password,
      role: rolePartner,
    });

    await this._createNotificationSettings(newUser.id)

    await this.userInfoRepository.save({
      first_name: registrationCompanyDto.first_name,
      last_name: registrationCompanyDto.last_name,
      company_name: registrationCompanyDto.company_name,
      job_title: registrationCompanyDto.job_title,
      phone: registrationCompanyDto.phone,
      user: newUser,
    });
    const company = await this.companyRepository.save({
      inn: registrationCompanyDto.inn,
      name: registrationCompanyDto.company_name,
      company_business_line: registrationCompanyDto.company_business_line,
      employees_count: registrationCompanyDto.employees_count,
      site_url: registrationCompanyDto.site_url,
      promoted_products: registrationCompanyDto.promoted_products,
      products_of_interest: registrationCompanyDto.products_of_interest,
      main_customers: registrationCompanyDto.main_customers,
      owner: newUser,
      status: CompanyStatus.Pending,
    });

    await this.companyEmployeeRepository.save({
      company_id: company.id,
      employee_id: newUser.id,
      status: CompanyEmployeeStatus.Accept,
    });

    await this.emailConfirmerService.send({
      user_id: newUser.id,
      email: newUser.email,
      method: EmailConfirmerMethod.EmailConfirmation
    });

    // ===== ВСТРОЕННЫЙ ВЫЗОВ РАССЫЛКИ АДМИНАМ =====
    await this.notifySuperAdminsAboutNewPartner({
      company_name: registrationCompanyDto.company_name,
      first_name: registrationCompanyDto.first_name,
      last_name: registrationCompanyDto.last_name,
      email: registrationCompanyDto.email,
    });
    // =============================================

    return newUser;
  }

  async createSuperAdminWithSecret(data: RegistrationSuperAdminWithSecretDto) {
    if(!(data.secret === SECRET_KEY)) {
      throw new HttpException(USER_SECRET, HttpStatus.FORBIDDEN);
    }

    return await this.createSuperAdmin(data);
  }

  async createSuperAdmin(data: RegistrationSuperAdminDto) {
    const userExist = await this.userRepository.findByEmail(data.email);

    if (userExist) throw new HttpException(USER_EXISTS, HttpStatus.FORBIDDEN);

    const { email, password: _password } = data;
    const roleSuperAdmin = await this.roleRepository.getSuperAdmin();

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
    });

    return user;
  }

  async findAll() {
    return await this.userRepository.find();
  }

  async findOne(id: number) {
    return await this.userRepository.findById(id);
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
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
