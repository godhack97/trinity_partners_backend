import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { UserSettingRepository } from "@orm/repositories/user-setting.repository";
import { UserToken } from "src/orm/entities/user-token.entity";
import { Repository, In } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { NotificationService } from "@api/notification/notification.service";

import {
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
} from "@nestjs/common";

import { ForbiddenInnRepository } from "src/orm/repositories/forbidden-inn.repository";
import { CompanyRepository } from "src/orm/repositories/company.repository";
import { RoleRepository } from "src/orm/repositories/role.repository";
import { UserInfoRepository } from "src/orm/repositories/user-info.repository";
import { UserRepository } from "src/orm/repositories/user.repository";
import { createCredentials, createToken } from "src/utils/password";
import { RegistrationEmployeeRequestDto } from "../registration/dto/request/registration-employee.request.dto";
import { RegistrationCompanyRequestDto } from "../registration/dto/request/registration-company.request.dto";
import { CompanyEmployeeRepository } from "@orm/repositories";
import {
  CompanyEmployeeStatus,
  CompanyStatus,
  NotificationCategory,
  UserNotificationType,
  UserSettingType,
  CompanyEntity,
  UserEntity,
} from "@orm/entities";
import {
  RegistrationSuperAdminDto,
  RegistrationSuperAdminWithSecretDto,
} from "../registration/dto/request/registration-super-admin.request.dto";
import { UserRoleEntity } from "@orm/entities/user-roles.entity";
import { RoleTypes } from "@app/types/RoleTypes";

const USER_SECRET = "Неправильно введен СЕКРЕТ";
const USER_EXISTS = "Пользователь с таким E-mail уже существует";
const USER_PHONE_EXISTS = "Пользователь с таким телефоном уже существует";
const INN_EXISTS = "Пользователь с таким ИНН уже существует";
const SECRET_KEY = "askhl32423ksajdhgfa!!dsfljnfla232fsafsdnn!21412";
const INN_FORBIDDEN = "ИНН запрещён к регистрации.";
const EMAIL_DOMAIN_REQUIRED =
  "Email сотрудника должен совпадать с доменом компании";
const LEGAL_CONSENT_REQUIRED =
  "Необходимо принять пользовательское соглашение и политику конфиденциальности";

@Injectable()
export class UserService {
  constructor(
    private readonly forbiddenInnRepository: ForbiddenInnRepository,
    private readonly userRepository: UserRepository,
    private readonly userInfoRepository: UserInfoRepository,
    private readonly roleRepository: RoleRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly notificationService: NotificationService,
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) { }

  async createEmployee(
    registrationEmployeeDto: RegistrationEmployeeRequestDto,
  ) {
    this.assertLegalConsentAccepted(registrationEmployeeDto);

    const user = await this.userRepository.findByEmail(
      registrationEmployeeDto.email,
    );

    if (user) throw new BadRequestException(USER_EXISTS);

    const isUserPhone = await this.userInfoRepository.findOneBy({
      phone: registrationEmployeeDto.phone,
    });

    if (isUserPhone) throw new BadRequestException(USER_PHONE_EXISTS);

    const company = await this.companyRepository.findOneBy({
      inn: registrationEmployeeDto.company_inn,
    });

    if (!company) {
      throw new BadRequestException("Компания с указанным ИНН не найдена");
    }

    await this.assertEmployeeEmailDomainMatchesCompany(
      registrationEmployeeDto.email,
      company,
    );

    const roleEmployee = await this.roleRepository.getEmployee();
    const businessRoleName =
      registrationEmployeeDto.business_role || RoleTypes.SalesManager;
    const businessRole = await this.roleRepository.findByRole(businessRoleName);
    const { email, password: _password } = registrationEmployeeDto;
    const { salt, password } = await createCredentials(_password);

    const newUser = await this.userRepository.save({
      salt,
      email,
      password,
      role: roleEmployee,
      ...this.getLegalConsentPatch("employee_registration"),
    });

    if (businessRole && businessRole.id !== roleEmployee.id) {
      await this.userRoleRepository.save({
        user_id: newUser.id,
        role_id: businessRole.id,
      });
    }

    await this._createNotificationSettings(newUser.id);

    await this.userInfoRepository.save({
      first_name: registrationEmployeeDto.first_name,
      last_name: registrationEmployeeDto.last_name,
      job_title: registrationEmployeeDto.job_title,
      phone: registrationEmployeeDto.phone,
      company_name: company.name,
      user: newUser,
    });

    await this.companyEmployeeRepository.save({
      company_id: company.id,
      employee_id: newUser.id,
      status: CompanyEmployeeStatus.TrinityPending,
    });

    await this.emailConfirmerService.send({
      user_id: newUser.id,
      email: newUser.email,
      method: EmailConfirmerMethod.EmailConfirmation,
    });

    await this.notifyPartnerAboutNewEmployee(company, newUser);
    await this.notifyTrinityManagerAboutNewEmployee(company, newUser);

    return newUser;
  }

  async updateRole(id: number, updateRoleDto: any) {
    await this.userRepository.update(id, {
      role_id: updateRoleDto.role_id
    });

    await this.userRoleRepository.delete({ user_id: id });

    await this.userRoleRepository.save({
      user_id: id,
      role_id: updateRoleDto.role_id,
    });

    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'user_roles', 'user_roles.role']
    });

    return updatedUser;
  }

  async updateRoles(id: number, updateRolesDto: { role_ids: number[] }) {
    if (!updateRolesDto.role_ids || updateRolesDto.role_ids.length === 0) {
      throw new BadRequestException("Необходимо указать хотя бы одну роль");
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new HttpException("Пользователь не найден", HttpStatus.NOT_FOUND);
    }

    const roles = await this.roleRepository.find({
      where: { id: In(updateRolesDto.role_ids) }
    });

    if (roles.length !== updateRolesDto.role_ids.length) {
      throw new BadRequestException("Одна или несколько ролей не найдены");
    }

    await this.userRepository.update(id, {
      role_id: updateRolesDto.role_ids[0]
    });

    await this.userRoleRepository.delete({ user_id: id });

    const userRoles = updateRolesDto.role_ids.map(role_id => ({
      user_id: id,
      role_id: role_id,
    }));

    await this.userRoleRepository.save(userRoles);

    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'user_roles', 'user_roles.role']
    });

    return updatedUser;
  }

  private async notifyPartnerAboutNewEmployee(
    company: CompanyEntity,
    employee: UserEntity,
  ) {
    try {
      const partnerUser = await this.userRepository.findByIdWithUserInfo(
        company.owner_id,
      );
      const employeeInfo = await this.userRepository.findByIdWithUserInfo(
        employee.id,
      );
      const employeeName = [
        employeeInfo.user_info?.first_name,
        employeeInfo.user_info?.last_name,
      ].filter(Boolean).join(" ") || employeeInfo.email;

      await this.emailConfirmerService.emailSend({
        email: partnerUser.email,
        subject: "Новый сотрудник зарегистрировался в вашей компании",
        template: "partner-new-employee-notification",
        context: {
          partnerName: partnerUser.user_info?.first_name || "Партнер",
          companyName: company.name,
          employeeFirstName: employeeInfo.user_info?.first_name,
          employeeLastName: employeeInfo.user_info?.last_name,
          employeeEmail: employeeInfo.email,
          employeeJobTitle: employeeInfo.user_info?.job_title,
          employeePhone: employeeInfo.user_info?.phone,
          registrationDate: new Date().toLocaleDateString("ru-RU"),
          link: "https://partner.trinity.ru/",
        },
      });

      await this.notificationService.send({
        user_id: partnerUser.id,
        title: "Новая заявка сотрудника",
        text: `${employeeName} зарегистрировался в компании ${company.name} и ожидает подтверждения.`,
        category: NotificationCategory.Company,
        actions: [
          {
            label: "Открыть сотрудников",
            url: "/employee.management",
          },
        ],
      });
    } catch (error) {
      console.error(
        "Ошибка отправки уведомления партнеру о новом сотруднике:",
        error,
      );
    }
  }

  private async notifyTrinityManagerAboutNewEmployee(
    company: CompanyEntity,
    employee: UserEntity,
  ) {
    try {
      const partnerUser = await this.userRepository.findById(company.owner_id);
      const managerId = company.validated_by_manager_id || partnerUser?.manager_id;
      if (!managerId) return;

      const manager = await this.userRepository.findById(managerId);
      if (!manager) return;

      const employeeInfo = await this.userRepository.findByIdWithUserInfo(
        employee.id,
      );
      const employeeName =
        [employeeInfo.user_info?.first_name, employeeInfo.user_info?.last_name]
          .filter(Boolean)
          .join(" ") || employeeInfo.email;

      await this.emailConfirmerService.emailSend({
        email: manager.email,
        subject: "Новая заявка сотрудника на проверку",
        template: "partner-new-employee-notification",
        context: {
          partnerName: "Менеджер Тринити",
          companyName: company.name,
          employeeFirstName: employeeInfo.user_info?.first_name,
          employeeLastName: employeeInfo.user_info?.last_name,
          employeeEmail: employeeInfo.email,
          employeeJobTitle: employeeInfo.user_info?.job_title,
          employeePhone: employeeInfo.user_info?.phone,
          registrationDate: new Date().toLocaleDateString("ru-RU"),
          link: "https://partner.trinity.ru/",
        },
      });

      await this.notificationService.send({
        user_id: manager.id,
        title: "Новая заявка сотрудника",
        text: `${employeeName} зарегистрировался в компании ${company.name} и ожидает проверки менеджером Тринити.`,
        category: NotificationCategory.Company,
        actions: [
          {
            label: "Открыть заявки",
            url: "/admin/partner",
          },
        ],
      });
    } catch (error) {
      console.error(
        "Ошибка отправки уведомления менеджеру Тринити о новом сотруднике:",
        error,
      );
    }
  }

  private async notifyTrinityManagersAboutNewPartner({
    company_name,
    first_name,
    last_name,
    email,
  }: {
    company_name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
  }) {
    const roleNames = [RoleTypes.SuperAdmin, RoleTypes.PartnerManager];
    const managers = await this.userRepository
      .createQueryBuilder("u")
      .distinct(true)
      .leftJoin("user_roles", "ur", "u.id = ur.user_id")
      .leftJoin("roles", "r", "ur.role_id = r.id")
      .leftJoin("roles", "r2", "u.role_id = r2.id")
      .where("(r.name IN (:...roleNames) OR r2.name IN (:...roleNames))", {
        roleNames,
      })
      .getMany();

    const partnerName =
      company_name ||
      [first_name, last_name].filter(Boolean).join(" ") ||
      "Партнёр";
    const partnerEmail = email;

    for (const admin of managers) {
      await this.notificationService.send({
        user_id: admin.id,
        title: "Новая заявка компании",
        text: `Компания ${partnerName} (${partnerEmail}) ожидает подтверждения.`,
        category: NotificationCategory.Company,
        actions: [
          {
            label: "Открыть заявки",
            url: "/admin/partner?status=pending",
          },
        ],
      });
    }
  }

  async createCompany(registrationCompanyDto: RegistrationCompanyRequestDto) {
    this.assertLegalConsentAccepted(registrationCompanyDto);

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

    const isForbiddenInn = await this.forbiddenInnRepository.findByInn(
      registrationCompanyDto.inn,
    );

    if (isForbiddenInn) throw new BadRequestException(INN_FORBIDDEN);

    const { email, password: _password } = registrationCompanyDto;
    const rolePartner = await this.roleRepository.getPartner();
    const roleCompanyAdmin = await this.roleRepository.findByRole(
      RoleTypes.CompanyAdmin,
    );

    const { salt, password } = await createCredentials(_password);

    const newUser = await this.userRepository.save({
      salt,
      email,
      password,
      role: rolePartner,
      ...this.getLegalConsentPatch("company_registration"),
    });

    await this.userRoleRepository.save({
      user_id: newUser.id,
      role_id: rolePartner.id,
    });

    if (roleCompanyAdmin && roleCompanyAdmin.id !== rolePartner.id) {
      await this.userRoleRepository.save({
        user_id: newUser.id,
        role_id: roleCompanyAdmin.id,
      });
    }

    await this._createNotificationSettings(newUser.id);

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
      partnership_type: registrationCompanyDto.partnership_type,
      employees_count: registrationCompanyDto.employees_count,
      site_url: registrationCompanyDto.site_url,
      promoted_products: registrationCompanyDto.promoted_products,
      products_of_interest: registrationCompanyDto.products_of_interest,
      main_customers: registrationCompanyDto.main_customers,
      email_domain: this.extractEmailDomain(registrationCompanyDto.email),
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
      method: EmailConfirmerMethod.EmailConfirmation,
    });

    await this.notifyTrinityManagersAboutNewPartner({
      company_name: registrationCompanyDto.company_name,
      first_name: registrationCompanyDto.first_name,
      last_name: registrationCompanyDto.last_name,
      email: registrationCompanyDto.email,
    });

    return newUser;
  }

  private extractEmailDomain(email?: string | null) {
    const domain = `${email || ""}`.trim().toLowerCase().split("@")[1];
    return domain || "";
  }

  private assertLegalConsentAccepted(data: {
    agreement_accepted?: boolean;
    privacy_policy_accepted?: boolean;
  }) {
    if (data.agreement_accepted && data.privacy_policy_accepted) return;
    throw new BadRequestException(LEGAL_CONSENT_REQUIRED);
  }

  private getLegalConsentPatch(source: string) {
    return {
      agreement_accepted: true,
      privacy_policy_accepted: true,
      legal_accepted_at: new Date(),
      legal_accepted_source: source,
    };
  }

  private async assertEmployeeEmailDomainMatchesCompany(
    employeeEmail: string,
    company: CompanyEntity,
  ) {
    const employeeDomain = this.extractEmailDomain(employeeEmail);
    if (!employeeDomain) {
      throw new BadRequestException(EMAIL_DOMAIN_REQUIRED);
    }

    let companyDomain = `${company.email_domain || ""}`.trim().toLowerCase();
    const owner = await this.userRepository.findByIdWithUserInfo(
      company.owner_id,
    );

    if (!companyDomain && owner?.email) {
      companyDomain = this.extractEmailDomain(owner.email);
      if (companyDomain) {
        await this.companyRepository.update(company.id, {
          email_domain: companyDomain,
        });
      }
    }

    if (!companyDomain || employeeDomain === companyDomain) return;

    const adminName =
      [owner?.user_info?.first_name, owner?.user_info?.last_name]
        .filter(Boolean)
        .join(" ") || owner?.email || "администратором компании";

    throw new BadRequestException(
      `${EMAIL_DOMAIN_REQUIRED} (${companyDomain}). Обратитесь к администратору компании: ${adminName}.`,
    );
  }

  async createSuperAdminWithSecret(data: RegistrationSuperAdminWithSecretDto) {
    if (!(data.secret === SECRET_KEY)) {
      throw new HttpException(USER_SECRET, HttpStatus.FORBIDDEN);
    }

    return await this.createSuperAdmin(data);
  }

  async update(id: number, updateData: Partial<UserEntity>) {
    await this.userRepository.update(id, updateData);

    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'manager', 'user_roles', 'user_roles.role']
    });

    return updatedUser;
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
      },
    ]);
  }
}
