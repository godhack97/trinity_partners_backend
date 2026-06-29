import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { NotificationService } from "@api/notification/notification.service";
import { RoleTypes } from "@app/types/RoleTypes";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InternalServerErrorException } from "@nestjs/common/exceptions/internal-server-error.exception";
import {
  CompanyEmployeeStatus,
  CompanyStatus,
  NotificationCategory,
  UserEntity,
} from "@orm/entities";
import {
  CompanyEmployeeRepository,
  CompanyRepository,
  UserRepository,
  DealRepository,
} from "@orm/repositories";
import { PartnerFilterRequestDto } from "./dto/partner-filters-request.dto";

@Injectable()
export default class AdminPartnerService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly dealRepository: DealRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly notificationService: NotificationService,
  ) {}

  async getCount(): Promise<number> {
    const qb = this.companyRepository.createQueryBuilder("cmp");

    qb.leftJoinAndMapOne("cmp.owner", "users", "usr", "usr.id = cmp.owner");

    qb.andWhere("usr.email_confirmed = 1");

    return await qb.getCount();
  }

  async getCountByStatus(status: CompanyStatus): Promise<number> {
    const qb = this.companyRepository.createQueryBuilder("cmp");

    qb.leftJoinAndMapOne("cmp.owner", "users", "usr", "usr.id = cmp.owner");

    qb.andWhere("usr.email_confirmed = 1");
    qb.andWhere("cmp.status = :s", { s: status });

    return await qb.getCount();
  }

  async getAll(filters: PartnerFilterRequestDto) {
    const qb = this.companyRepository.createQueryBuilder("cmp");
  
    qb.leftJoinAndMapOne("cmp.owner", "users", "usr", "usr.id = cmp.owner_id");
  
    qb.leftJoinAndMapOne(
      "usr.info",
      "users_info",
      "uinf",
      "uinf.user_id = usr.id",
    );
  
    qb.leftJoinAndMapOne(
      "usr.manager",
      "users",
      "mgr",
      "mgr.id = usr.manager_id",
    );
  
    qb.andWhere("usr.email_confirmed = 1");
  
    filters?.status && qb.andWhere("cmp.status = :s", { s: filters.status });
  
    const companies = await qb.getMany();
  
    // Получаем ID пользователей и компаний для агрегации
    const userIds = companies.map((c) => c.owner.id);
    const companyIds = companies.map((c) => c.id);
  
    // Подсчет сделок по создателям
    const dealsCount =
      userIds.length > 0
        ? await this.dealRepository
            .createQueryBuilder("deals")
            .select("deals.creator_id", "creator_id")
            .addSelect("COUNT(deals.id)", "count")
            .where("deals.creator_id IN (:...userIds)", { userIds })
            .groupBy("deals.creator_id")
            .getRawMany()
        : [];
  
    // Подсчет активных сотрудников по компаниям
    const employeesCount =
      companyIds.length > 0
        ? await this.companyEmployeeRepository
            .createQueryBuilder("ce")
            .select("ce.company_id", "company_id")
            .addSelect("COUNT(ce.id)", "count")
            .where("ce.company_id IN (:...companyIds)", { companyIds })
            .andWhere("ce.status = :status", { status: "accept" })
            .groupBy("ce.company_id")
            .getRawMany()
        : [];
  
    // Создаем карты для быстрого поиска
    const dealsMap = new Map(
      dealsCount.map((d) => [d.creator_id, parseInt(d.count)]),
    );
    const employeesMap = new Map(
      employeesCount.map((e) => [e.company_id, parseInt(e.count)]),
    );
  
    // Добавляем данные к компаниям
    return companies.map((company) => ({
      ...company,
      dealsCount: dealsMap.get(company.owner.id) || 0,
      employeesCount: employeesMap.get(company.id) || 0,
    }));
  }

  async getEmployeeRequests(auth_user: UserEntity) {
    const qb = this.companyEmployeeRepository
      .createQueryBuilder("ce")
      .leftJoinAndMapOne("ce.company", "companies", "cmp", "cmp.id = ce.company_id")
      .leftJoinAndMapOne("ce.employee", "users", "usr", "usr.id = ce.employee_id")
      .leftJoinAndMapOne(
        "usr.info",
        "users_info",
        "uinf",
        "uinf.user_id = usr.id",
      )
      .leftJoinAndMapOne("cmp.owner", "users", "owner", "owner.id = cmp.owner_id")
      .leftJoinAndMapOne(
        "owner.info",
        "owner_info",
        "owner_info.user_id = owner.id",
      )
      .where("ce.status IN (:...statuses)", {
        statuses: [
          CompanyEmployeeStatus.TrinityPending,
          CompanyEmployeeStatus.InviteTrinityPending,
        ],
      })
      .orderBy("ce.created_at", "DESC");

    if (!this.hasRole(auth_user, RoleTypes.SuperAdmin)) {
      qb.andWhere(
        "(cmp.validated_by_manager_id = :managerId OR owner.manager_id = :managerId)",
        { managerId: auth_user.id },
      );
    }

    const requests = await qb.getMany();

    return requests.map((request) => ({
      id: request.id,
      status: request.status,
      request_type:
        request.status === CompanyEmployeeStatus.InviteTrinityPending
          ? "Приглашение администратором"
          : "Самостоятельная регистрация",
      created_at: request.created_at,
      company: request.company,
      employee: request.employee,
    }));
  }

  private hasRole(user: UserEntity, roleName: RoleTypes): boolean {
    if (user.role?.name === roleName) return true;
    if (user.roles?.some((role) => role.name === roleName)) return true;
    return user.user_roles?.some((userRole) => userRole.role?.name === roleName) || false;
  }

  async accept(id: number, validator: UserEntity) {
    const companyEntity = await this.companyRepository.findOneBy({ id });

    if (!companyEntity)
      throw new HttpException(
        `Компания не найдена: ${id}`,
        HttpStatus.FORBIDDEN,
      );

    await this.companyRepository.update(id, {
      status: CompanyStatus.Accept,
      validated_by_manager_id: validator.id,
      validated_at: new Date(),
    });

    await this.userRepository.updateUser(companyEntity.owner_id, {
      is_activated: true,
      manager_id: validator.id,
    });

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({
      employee_id: companyEntity.owner_id,
    });

    if (!companyEmployee)
      throw new HttpException("Сотрудник не найдена", HttpStatus.FORBIDDEN);

    await this.companyEmployeeRepository.update(companyEmployee.id, {
      status: CompanyEmployeeStatus.Accept,
    });

    const user = await this.userRepository.findById(companyEntity.owner_id);

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: "Подтверждение регистрации!",
      template: "request-company-approve",
      context: {
        link: "https://partner.trinity.ru/",
      },
    });

    await this.notificationService.send({
      user_id: companyEntity.owner_id,
      title: "Компания подтверждена",
      text: `Компания «${companyEntity.name}» подтверждена менеджером Тринити и закреплена за ним.`,
      category: NotificationCategory.Company,
      actions: [
        {
          label: "Перейти на портал",
          url: "/dashboard",
        },
      ],
    });
  }

  async reject(id: number) {
    const companyEntity = await this.companyRepository.findOneBy({ id });

    if (!companyEntity)
      throw new HttpException(
        `Компания не найдена: ${id}`,
        HttpStatus.FORBIDDEN,
      );

    const updateResult = await this.companyRepository.update(id, {
      status: CompanyStatus.Reject,
    });

    if (updateResult.affected === 0)
      throw new InternalServerErrorException("Не удалось обновить");

    await this.userRepository.update(companyEntity.owner_id, {
      is_activated: false,
    });

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({
      employee_id: companyEntity.owner_id,
    });

    if (!companyEmployee)
      throw new HttpException("Сотрудник не найдена", HttpStatus.FORBIDDEN);

    await this.companyEmployeeRepository.update(companyEmployee.id, {
      status: CompanyEmployeeStatus.Reject,
    });

    const user = await this.userRepository.findById(companyEntity.owner_id);

    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: "Регистрация отклонена!",
      template: "request-company-reject",
      context: {
        link: "https://partner.trinity.ru/",
      },
      //html: 'К сожалению, на данный момент доступ не одобрен. Если Вы не согласны с решением администратора или считаете. что произошла ошибка, свяжитесь с нами по почте: <a href="mailto:support@trinity.ru">support@trinity.ru</a>'
    });

    await this.notifyCompanyAccessChanged(
      companyEntity.owner_id,
      "Партнёрство отклонено",
      `Заявка компании «${companyEntity.name}» отклонена. Доступ к порталу отозван.`,
    );
  }

  async acceptEmployee(id: number, validator: UserEntity) {
    const companyEmployee = await this.companyEmployeeRepository.findOne({
      where: { id },
      relations: ["company", "employee", "employee.user_info"],
    });

    if (!companyEmployee) {
      throw new HttpException("Заявка сотрудника не найдена", HttpStatus.NOT_FOUND);
    }

    if (
      ![
        CompanyEmployeeStatus.TrinityPending,
        CompanyEmployeeStatus.InviteTrinityPending,
      ].includes(companyEmployee.status)
    ) {
      throw new HttpException(
        "Заявка сотрудника не ожидает проверки менеджером Тринити",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (companyEmployee.status === CompanyEmployeeStatus.InviteTrinityPending) {
      await this.companyEmployeeRepository.update(companyEmployee.id, {
        status: CompanyEmployeeStatus.Invited,
      });

      await this.emailConfirmerService.emailSend({
        email: companyEmployee.employee.email,
        subject: "Вас пригласили присоединиться к компании",
        template: "employee-add-to-company",
        context: {
          link: "https://partner.trinity.ru/",
        },
      });

      await this.notificationService.send({
        user_id: companyEmployee.employee_id,
        title: "Приглашение подтверждено",
        text: `Менеджер Тринити подтвердил приглашение в компанию «${companyEmployee.company.name}».`,
        category: NotificationCategory.Company,
        actions: [
          {
            label: "Открыть портал",
            url: "/dashboard",
          },
        ],
      });

      return {
        success: true,
        status: CompanyEmployeeStatus.Invited,
        validated_by_manager_id: validator.id,
      };
    }

    await this.companyEmployeeRepository.update(companyEmployee.id, {
      status: CompanyEmployeeStatus.CompanyPending,
    });

    const employeeName = this.getUserName(companyEmployee.employee);
    await this.notificationService.send({
      user_id: companyEmployee.company.owner_id,
      title: "Заявка сотрудника проверена",
      text: `${employeeName} прошёл проверку менеджером Тринити. Подтвердите добавление сотрудника в компанию.`,
      category: NotificationCategory.Company,
      actions: [
        {
          label: "Открыть сотрудников",
          url: "/employee.management",
        },
      ],
    });

    await this.notificationService.send({
      user_id: companyEmployee.employee_id,
      title: "Заявка передана администратору компании",
      text: "Менеджер Тринити подтвердил вашу заявку. Ожидайте подтверждения администратором компании.",
      category: NotificationCategory.Company,
      actions: [
        {
          label: "Открыть портал",
          url: "/dashboard",
        },
      ],
    });

    return {
      success: true,
      status: CompanyEmployeeStatus.CompanyPending,
      validated_by_manager_id: validator.id,
    };
  }

  async rejectEmployee(id: number) {
    const companyEmployee = await this.companyEmployeeRepository.findOne({
      where: { id },
      relations: ["company", "employee", "employee.user_info"],
    });

    if (!companyEmployee) {
      throw new HttpException("Заявка сотрудника не найдена", HttpStatus.NOT_FOUND);
    }

    if (
      ![
        CompanyEmployeeStatus.TrinityPending,
        CompanyEmployeeStatus.InviteTrinityPending,
        CompanyEmployeeStatus.CompanyPending,
        CompanyEmployeeStatus.Pending,
      ].includes(companyEmployee.status)
    ) {
      throw new HttpException(
        "Заявка сотрудника не может быть отклонена на этом этапе",
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.companyEmployeeRepository.update(companyEmployee.id, {
      status: CompanyEmployeeStatus.Reject,
    });
    await this.userRepository.update(companyEmployee.employee_id, {
      is_activated: false,
    });

    await this.emailConfirmerService.emailSend({
      email: companyEmployee.employee.email,
      subject: "Заявка сотрудника отклонена",
      template: "employee-access-limited",
      context: {
        reason: "Заявка на присоединение к компании отклонена менеджером Тринити",
        companyAdmins: await this.getCompanyAdminsText(companyEmployee.company_id),
      },
    });

    await this.notificationService.send({
      user_id: companyEmployee.employee_id,
      title: "Заявка сотрудника отклонена",
      text: `Заявка на присоединение к компании «${companyEmployee.company.name}» отклонена менеджером Тринити.`,
      category: NotificationCategory.Company,
    });

    return { success: true, status: CompanyEmployeeStatus.Reject };
  }

  async suspend(id: number) {
    const companyEntity = await this.companyRepository.findOneBy({ id });

    if (!companyEntity)
      throw new HttpException(
        `Компания не найдена: ${id}`,
        HttpStatus.FORBIDDEN,
      );

    const updateResult = await this.companyRepository.update(id, {
      status: CompanyStatus.Suspended,
    });

    if (updateResult.affected === 0)
      throw new InternalServerErrorException("Не удалось обновить");

    await this.userRepository.update(companyEntity.owner_id, {
      is_activated: false,
    });

    const user = await this.userRepository.findById(companyEntity.owner_id);
    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: "Доступ к партнерскому порталу Тринити ограничен",
      template: "company-access-limited",
      context: await this.getCompanyAccessLimitedContext(
        companyEntity.id,
        "приостановлен",
        "Партнерство приостановлено менеджером Тринити",
      ),
    });

    await this.notifyCompanyAccessChanged(
      companyEntity.owner_id,
      "Партнёрство приостановлено",
      `Доступ компании «${companyEntity.name}» к порталу приостановлен. Свяжитесь с вашим менеджером Тринити.`,
    );

    await this.notifyTrinityAdminsAboutCompanySuspended(companyEntity);
  }

  private async notifyCompanyAccessChanged(
    ownerId: number,
    title: string,
    text: string,
  ) {
    await this.notificationService.send({
      user_id: ownerId,
      title,
      text,
      category: NotificationCategory.Company,
      actions: [
        {
          label: "Профиль компании",
          url: "/company-profile",
        },
      ],
    });
  }

  private async notifyTrinityAdminsAboutCompanySuspended(company: {
    id: number;
    name: string;
  }) {
    const roleNames = [RoleTypes.SuperAdmin, RoleTypes.PartnerManager];
    const admins = await this.userRepository
      .createQueryBuilder("u")
      .distinct(true)
      .leftJoin("user_roles", "ur", "u.id = ur.user_id")
      .leftJoin("roles", "r", "ur.role_id = r.id")
      .leftJoin("roles", "r2", "u.role_id = r2.id")
      .where("(r.name IN (:...roleNames) OR r2.name IN (:...roleNames))", {
        roleNames,
      })
      .getMany();

    for (const admin of admins) {
      await this.emailConfirmerService.emailSend({
        email: admin.email,
        subject: `Партнёрство компании «${company.name}» приостановлено`,
        template: "company-access-limited",
        context: await this.getCompanyAccessLimitedContext(
          company.id,
          "приостановлен",
          "Партнерство приостановлено менеджером Тринити",
        ),
      });

      await this.notificationService.send({
        user_id: admin.id,
        title: "Партнёрство приостановлено",
        text: `Доступ компании «${company.name}» к порталу приостановлен. Свяжитесь с ответственным менеджером Тринити.`,
        category: NotificationCategory.Company,
        actions: [
          {
            label: "Открыть партнёров",
            url: `/admin/partner?status=${CompanyStatus.Suspended}`,
          },
        ],
      });
    }
  }

  private async getCompanyAccessLimitedContext(
    companyId: number,
    accessState: string,
    reason: string,
  ) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: [
        "owner",
        "owner.manager",
        "owner.manager.user_info",
        "validated_by_manager",
        "validated_by_manager.user_info",
      ],
    });
    const manager = company?.validated_by_manager || company?.owner?.manager;

    return {
      companyName: company?.name || "Компания",
      accessState,
      reason,
      managerName: this.getUserName(manager) || "Менеджер Тринити",
      managerPhone: manager?.user_info?.phone || "Телефон не указан",
      managerEmail: manager?.email || "Email не указан",
    };
  }

  private async getCompanyAdminsText(companyId: number) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ["owner", "owner.user_info"],
    });
    const admins = new Map<number, string>();

    if (company?.owner) {
      admins.set(company.owner.id, this.getUserName(company.owner) || company.owner.email);
    }

    const employees =
      await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(
        companyId,
      );

    employees
      .filter((employee) => employee.status === CompanyEmployeeStatus.Accept)
      .filter((employee) =>
        employee.employee
          ? this.hasAnyRole(employee.employee, [
              RoleTypes.CompanyAdmin,
              RoleTypes.Partner,
              RoleTypes.EmployeeAdmin,
            ])
          : false,
      )
      .forEach((employee) =>
        admins.set(
          employee.employee_id,
          this.getUserName(employee.employee) || employee.employee.email,
        ),
      );

    return Array.from(admins.values()).join(", ") || "администратором компании";
  }

  private hasAnyRole(user: UserEntity, roleNames: RoleTypes[]) {
    const userRoleNames = [
      user.role?.name,
      ...(user.roles || []).map((role) => role.name),
    ].filter(Boolean);

    return roleNames.some((roleName) => userRoleNames.includes(roleName));
  }

  private getUserName(user?: UserEntity | null) {
    if (!user) return "";

    return (
      [user.user_info?.first_name, user.user_info?.last_name]
        .filter(Boolean)
        .join(" ") || user.email
    );
  }
}
