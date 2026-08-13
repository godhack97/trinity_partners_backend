import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { NotificationService } from "@api/notification/notification.service";
import { RoleTypes } from "@app/types/RoleTypes";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InternalServerErrorException } from "@nestjs/common/exceptions/internal-server-error.exception";
import {
  CompanyEntity,
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
import { UpdatePartnerBusinessFieldsRequestDto } from "./dto/update-partner-business-fields.request.dto";

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

    qb.leftJoinAndMapOne("cmp.owner", "users", "usr", "usr.id = cmp.owner_id");

    qb.andWhere("usr.email_confirmed = 1");

    return await qb.getCount();
  }

  async getCountByStatus(status: CompanyStatus): Promise<number> {
    const qb = this.companyRepository.createQueryBuilder("cmp");

    qb.leftJoinAndMapOne("cmp.owner", "users", "usr", "usr.id = cmp.owner_id");

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
    qb.leftJoinAndMapOne(
      "mgr.info",
      "users_info",
      "mgr_info",
      "mgr_info.user_id = mgr.id",
    );

    qb.leftJoinAndMapOne(
      "cmp.validated_by_manager",
      "users",
      "validator",
      "validator.id = cmp.validated_by_manager_id",
    );
    qb.leftJoinAndMapOne(
      "cmp.responsible_manager",
      "users",
      "responsible_manager",
      "responsible_manager.id = cmp.responsible_manager_id",
    );
    qb.leftJoinAndMapOne(
      "cmp.approved_by_user",
      "users",
      "approved_by_user",
      "approved_by_user.id = cmp.approved_by_user_id",
    );
    qb.leftJoinAndMapOne(
      "cmp.review_locked_by_user",
      "users",
      "review_locked_by_user",
      "review_locked_by_user.id = cmp.review_locked_by_user_id",
    );
    qb.leftJoinAndMapOne(
      "cmp.suspended_by_user",
      "users",
      "suspended_by_user",
      "suspended_by_user.id = cmp.suspended_by_user_id",
    );

    filters?.status && qb.andWhere("cmp.status = :s", { s: filters.status });
    filters?.partnership_type &&
      qb.andWhere("cmp.partnership_type = :partnershipType", {
        partnershipType: filters.partnership_type,
      });

    qb.orderBy("cmp.created_at", "DESC").addOrderBy("cmp.id", "DESC");
    const companies = await qb.getMany();

    const userIds = companies.map((company) => company.owner_id);
    const companyIds = companies.map((c) => c.id);

    const memberships = companyIds.length
      ? await this.companyEmployeeRepository.findCompanyEmployeesByCompanyIds(
          companyIds,
        )
      : [];
    const deals = companyIds.length
      ? await this.dealRepository
          .createQueryBuilder("deal")
          .select("deal.id", "id")
          .addSelect("deal.deal_num", "deal_num")
          .addSelect("deal.title", "title")
          .addSelect("deal.status", "status")
          .addSelect("deal.deal_sum", "deal_sum")
          .addSelect("deal.creator_id", "creator_id")
          .addSelect("deal.creator_company_id", "creator_company_id")
          .addSelect("deal.distributor_company_id", "distributor_company_id")
          .addSelect("deal.integrator_company_id", "integrator_company_id")
          .addSelect("deal.created_at", "created_at")
          .where(
            `(deal.creator_company_id IN (:...companyIds)
              OR deal.distributor_company_id IN (:...companyIds)
              OR deal.integrator_company_id IN (:...companyIds)
              OR (deal.creator_company_id IS NULL AND deal.creator_id IN (:...userIds)))`,
            { companyIds, userIds },
          )
          .orderBy("deal.created_at", "DESC")
          .getRawMany()
      : [];

    const membershipsByCompany = new Map<number, any[]>();
    memberships.forEach((membership) => {
      const current = membershipsByCompany.get(membership.company_id) || [];
      current.push({
        id: membership.id,
        status: membership.status,
        created_at: membership.created_at,
        updated_at: membership.updated_at,
        employee: this.toSafeUser(membership.employee),
      });
      membershipsByCompany.set(membership.company_id, current);
    });

    const ownerCompanyById = new Map(
      companies.map((company) => [company.owner_id, company.id]),
    );
    const dealsByCompany = new Map<number, any[]>();
    deals.forEach((deal) => {
      const relatedCompanyIds = new Set<number>([
        Number(deal.creator_company_id) || ownerCompanyById.get(Number(deal.creator_id)),
        Number(deal.distributor_company_id),
        Number(deal.integrator_company_id),
      ].filter(Boolean));
      relatedCompanyIds.forEach((companyId) => {
        const roles = [
          Number(deal.creator_company_id) === companyId ||
          (!deal.creator_company_id && ownerCompanyById.get(Number(deal.creator_id)) === companyId)
            ? "creator"
            : null,
          Number(deal.distributor_company_id) === companyId ? "distributor" : null,
          Number(deal.integrator_company_id) === companyId ? "integrator" : null,
        ].filter(Boolean);
        const current = dealsByCompany.get(companyId) || [];
        current.push({ ...deal, company_roles: roles });
        dealsByCompany.set(companyId, current);
      });
    });

    return companies.map((company) => {
      const companyDeals = dealsByCompany.get(company.id) || [];
      const companyMemberships = membershipsByCompany.get(company.id) || [];
      return {
        id: company.id,
        created_at: company.created_at,
        updated_at: company.updated_at,
        inn: company.inn,
        owner_id: company.owner_id,
        validated_by_manager_id: company.validated_by_manager_id || null,
        validated_at: company.validated_at || null,
        responsible_manager_id: company.responsible_manager_id || null,
        approved_by_user_id: company.approved_by_user_id || null,
        approved_at: company.approved_at || null,
        contact_email: company.contact_email || null,
        contact_phone: company.contact_phone || null,
        review_locked_at: company.review_locked_at || null,
        review_locked_by_user_id: company.review_locked_by_user_id || null,
        review_lock_reason: company.review_lock_reason || null,
        suspended_at: company.suspended_at || null,
        suspended_by_user_id: company.suspended_by_user_id || null,
        suspension_reason: company.suspension_reason || null,
        name: company.name,
        company_business_line: company.company_business_line,
        employees_count: company.employees_count,
        site_url: company.site_url,
        promoted_products: company.promoted_products,
        products_of_interest: company.products_of_interest,
        main_customers: company.main_customers,
        email_domain: company.email_domain || null,
        partnership_type: company.partnership_type,
        status: company.status,
        partner_level: company.partner_level || null,
        certificate_expiry: company.certificate_expiry || null,
        owner: this.toSafeUser(company.owner),
        validated_by_manager: this.toSafeUser(company.validated_by_manager),
        responsible_manager: this.toSafeUser(company.responsible_manager),
        approved_by_user: this.toSafeUser(company.approved_by_user),
        review_locked_by_user: this.toSafeUser(company.review_locked_by_user),
        suspended_by_user: this.toSafeUser(company.suspended_by_user),
        employees: companyMemberships,
        employeesCount: companyMemberships.filter(
          ({ status }) => status === CompanyEmployeeStatus.Accept,
        ).length,
        deals: companyDeals,
        dealsCount: companyDeals.length,
      };
    });
  }

  async updateBusinessFields(
    id: number,
    data: UpdatePartnerBusinessFieldsRequestDto,
  ) {
    const company = await this.companyRepository.findOneBy({ id });
    if (!company) {
      throw new HttpException(`Компания не найдена: ${id}`, HttpStatus.NOT_FOUND);
    }

    const { responsible_manager_id, ...businessFields } = data;
    if (responsible_manager_id !== undefined && responsible_manager_id !== null) {
      const manager = await this.userRepository.findByIdWithPermissions(
        responsible_manager_id,
      );
      if (!manager || !this.hasRole(manager, RoleTypes.PartnerManager)) {
        throw new HttpException(
          "Ответственный менеджер не найден",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const patch = {
      ...businessFields,
      ...(data.certificate_expiry === undefined
        ? {}
        : {
            certificate_expiry: data.certificate_expiry
              ? new Date(`${data.certificate_expiry}T00:00:00.000Z`)
              : null,
          }),
      ...(data.email_domain === undefined
        ? {}
        : { email_domain: data.email_domain?.trim().toLowerCase() || null }),
      ...(data.name === undefined ? {} : { name: data.name.trim() }),
      ...(data.inn === undefined ? {} : { inn: data.inn.trim() }),
      ...(data.contact_email === undefined
        ? {}
        : { contact_email: data.contact_email?.trim().toLowerCase() || null }),
      ...(data.contact_phone === undefined
        ? {}
        : { contact_phone: data.contact_phone?.trim() || null }),
      ...(responsible_manager_id === undefined
        ? {}
        : { responsible_manager_id }),
    };

    if (responsible_manager_id === undefined) {
      const result = await this.companyRepository.update(id, patch);
      if (result.affected === 0) {
        throw new InternalServerErrorException("Не удалось обновить компанию");
      }
    } else {
      await this.companyRepository.manager.transaction(async (manager) => {
        const result = await manager.getRepository(CompanyEntity).update(id, patch);
        if (result.affected === 0) {
          throw new InternalServerErrorException("Не удалось обновить компанию");
        }
        await manager.getRepository(UserEntity).update(company.owner_id, {
          manager_id: responsible_manager_id,
        });
      });
    }

    return { ...company, ...patch };
  }

  private toSafeUser(user?: UserEntity | null) {
    if (!user) return null;
    const value = user as UserEntity & { info?: Record<string, any> };
    const info = value.user_info || value.info || null;
    return {
      id: value.id,
      email: value.email,
      is_activated: value.is_activated,
      email_confirmed: value.email_confirmed,
      manager_id: value.manager_id || null,
      bitrix24_contact_id: value.bitrix24_contact_id || null,
      bitrix24_sync_status: value.bitrix24_sync_status || null,
      bitrix24_synced_at: value.bitrix24_synced_at || null,
      lastActivity: value.lastActivity || null,
      created_at: value.created_at,
      updated_at: value.updated_at,
      deleted_at: value.deleted_at || null,
      info,
      user_info: info,
      role: value.role
        ? {
            id: value.role.id,
            name: value.role.name,
            display_name: value.role.display_name,
          }
        : null,
      roles: (value.roles || []).map((role) => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
      })),
    };
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

  private assertCompanyStatus(
    company: { status: CompanyStatus },
    expectedStatus: CompanyStatus,
    operation: string,
  ) {
    if (company.status !== expectedStatus) {
      throw new HttpException(
        `Нельзя ${operation} компанию в статусе «${company.status}»`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async accept(id: number, validator: UserEntity) {
    const companyEntity = await this.companyRepository.findOneBy({ id });

    if (!companyEntity)
      throw new HttpException(
        `Компания не найдена: ${id}`,
        HttpStatus.NOT_FOUND,
      );

    this.assertCompanyStatus(
      companyEntity,
      CompanyStatus.Pending,
      "принять",
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
        HttpStatus.NOT_FOUND,
      );

    this.assertCompanyStatus(
      companyEntity,
      CompanyStatus.Pending,
      "отклонить",
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
        HttpStatus.NOT_FOUND,
      );

    this.assertCompanyStatus(
      companyEntity,
      CompanyStatus.Accept,
      "приостановить",
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

  async restore(id: number, validator: UserEntity) {
    return this.reactivate(
      id,
      validator,
      CompanyStatus.Reject,
      "Партнёрство восстановлено",
      "Компания восстановлена после отклонения. Доступ к порталу снова открыт.",
    );
  }

  async resume(id: number, validator: UserEntity) {
    return this.reactivate(
      id,
      validator,
      CompanyStatus.Suspended,
      "Доступ компании возобновлён",
      "Приостановка снята. Доступ компании к порталу снова открыт.",
    );
  }

  private async reactivate(
    id: number,
    validator: UserEntity,
    expectedStatus: CompanyStatus,
    title: string,
    text: string,
  ) {
    const companyEntity = await this.companyRepository.findOneBy({ id });

    if (!companyEntity) {
      throw new HttpException(`Компания не найдена: ${id}`, HttpStatus.NOT_FOUND);
    }

    this.assertCompanyStatus(
      companyEntity,
      expectedStatus,
      "восстановить",
    );

    const updateResult = await this.companyRepository.update(id, {
      status: CompanyStatus.Accept,
      validated_by_manager_id: validator.id,
      validated_at: new Date(),
    });

    if (updateResult.affected === 0) {
      throw new InternalServerErrorException("Не удалось обновить");
    }

    await this.userRepository.update(companyEntity.owner_id, {
      is_activated: true,
    });

    const companyEmployee = await this.companyEmployeeRepository.findOneBy({
      employee_id: companyEntity.owner_id,
    });

    if (companyEmployee) {
      await this.companyEmployeeRepository.update(companyEmployee.id, {
        status: CompanyEmployeeStatus.Accept,
      });
    }

    const user = await this.userRepository.findById(companyEntity.owner_id);
    await this.emailConfirmerService.emailSend({
      email: user.email,
      subject: title,
      template: "request-company-approve",
      context: {
        link: "https://partner.trinity.ru/",
      },
    });

    await this.notifyCompanyAccessChanged(
      companyEntity.owner_id,
      title,
      `${text} Компания «${companyEntity.name}».`,
    );
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
