import { RoleTypes } from "@app/types/RoleTypes";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CompanyEmployeeEntity,
  CompanyEmployeeStatus,
  CompanyEntity,
  CompanyLifecycleAction,
  CompanyStatus,
  CompanyStatusHistoryEntity,
  DealStatus,
  UserEntity,
} from "@orm/entities";
import {
  CompanyEmployeeRepository,
  CompanyRepository,
  UserRepository,
} from "@orm/repositories";
import { DataSource } from "typeorm";
import {
  ApproveCompanyRequestDto,
  AssignCompanyManagerRequestDto,
  CompanyListQueryDto,
  CompanyRestrictionReasonRequestDto,
  UpdateCompanyContactsRequestDto,
} from "./dto/company-management.request.dto";
import {
  CompanyCapabilitiesDto,
  CompanyDealStatisticsDto,
  CompanyDetailResponseDto,
  CompanyListItemResponseDto,
  CompanyListResponseDto,
  CompanyManagerSummaryDto,
} from "./dto/company-management.response.dto";
import {
  CompanyNotificationOutboxService,
  CompanyNotificationRecipient,
} from "./company-notification-outbox.service";

type CompanyStats = {
  employees: number;
  deals: CompanyDealStatisticsDto;
};

@Injectable()
export class CompanyManagementService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
    private readonly companyNotifications: CompanyNotificationOutboxService,
  ) {}

  async list(
    filters: CompanyListQueryDto,
    actor: UserEntity,
  ): Promise<CompanyListResponseDto> {
    const currentPage = filters.current_page || 1;
    const limit = filters.limit || 12;
    const query = this.createCompanyQuery(actor);
    const visibleTotal = await query.clone().getCount();

    if (filters.search) {
      query.andWhere(
        "(LOWER(company.name) LIKE :search OR REPLACE(REPLACE(company.inn, ' ', ''), '-', '') LIKE :innSearch)",
        {
          search: `%${filters.search.toLowerCase()}%`,
          innSearch: `%${filters.search.replace(/\D/g, "") || filters.search}%`,
        },
      );
    }
    if (filters.partnership_type) {
      query.andWhere("company.partnership_type = :partnershipType", {
        partnershipType: filters.partnership_type,
      });
    }
    if (filters.status) {
      query.andWhere("company.status = :status", { status: filters.status });
    }
    if (filters.responsible_manager_id) {
      query.andWhere(
        "company.responsible_manager_id = :responsibleManagerId",
        { responsibleManagerId: filters.responsible_manager_id },
      );
    }

    const filteredTotal = await query.clone().getCount();
    const companies = await query
      .addSelect(
        "CASE company.status WHEN 'pending' THEN 0 WHEN 'accept' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END",
        "company_status_order",
      )
      .orderBy("company_status_order", "ASC")
      .addOrderBy("company.updated_at", "DESC")
      .addOrderBy("company.id", "DESC")
      .skip((currentPage - 1) * limit)
      .take(limit)
      .getMany();

    const stats = await this.getCompanyStats(companies.map(({ id }) => id));

    return {
      data: companies.map((company) =>
        this.toListItem(company, actor, stats.get(company.id)),
      ),
      meta: {
        current_page: currentPage,
        limit,
        filtered_total: filteredTotal,
        visible_total: visibleTotal,
        pages_count: Math.ceil(filteredTotal / limit),
      },
    };
  }

  async detail(id: number, actor: UserEntity): Promise<CompanyDetailResponseDto> {
    const company = await this.findCompany(id);
    this.assertCanView(company, actor);
    const stats = await this.getCompanyStats([company.id]);
    return this.toDetail(company, actor, stats.get(company.id));
  }

  async ownCompany(actor: UserEntity): Promise<CompanyDetailResponseDto> {
    const company = await this.findOwnCompany(actor.id);
    if (!company) throw new NotFoundException("Компания пользователя не найдена");
    const stats = await this.getCompanyStats([company.id]);
    return this.toDetail(company, actor, stats.get(company.id), true);
  }

  async accessState(actor: UserEntity) {
    const company = await this.findOwnCompany(actor.id);
    if (!company) throw new NotFoundException("Компания пользователя не найдена");

    return {
      company_name: company.name,
      status: company.status,
      status_label: this.getStatusLabel(company.status),
      is_review_locked: Boolean(company.review_locked_at),
      reason:
        company.review_lock_reason || company.suspension_reason || null,
      responsible_manager: this.toManager(company.responsible_manager),
      allowed_actions: ["support", "logout"],
    };
  }

  async managerOptions(): Promise<CompanyManagerSummaryDto[]> {
    const users = await this.userRepository
      .createQueryBuilder("manager")
      .distinct(true)
      .leftJoinAndSelect("manager.user_info", "manager_info")
      .leftJoin("manager.role", "primary_role")
      .leftJoin("manager.user_roles", "manager_user_role")
      .leftJoin("manager_user_role.role", "secondary_role")
      .where("manager.deleted_at IS NULL")
      .andWhere("manager.is_activated = :active", { active: true })
      .andWhere(
        "(primary_role.name = :managerRole OR secondary_role.name = :managerRole)",
        { managerRole: RoleTypes.PartnerManager },
      )
      .orderBy("manager_info.last_name", "ASC")
      .addOrderBy("manager_info.first_name", "ASC")
      .addOrderBy("manager.email", "ASC")
      .getMany();

    return users.map((manager) => this.toManager(manager));
  }

  async approve(
    id: number,
    actor: UserEntity,
    data: ApproveCompanyRequestDto,
  ) {
    const company = await this.findCompany(id);
    if (company.status !== CompanyStatus.Pending) {
      throw new ConflictException("Подтвердить можно только компанию на проверке");
    }
    if (company.review_locked_at) {
      throw new ConflictException(
        "Сначала снимите блокировку с заявки компании",
      );
    }

    const actorRoles = this.getRoleNames(actor);
    const isSuperAdmin = actorRoles.includes(RoleTypes.SuperAdmin);
    const isPartnerManager = actorRoles.includes(RoleTypes.PartnerManager);
    if (!isSuperAdmin && !isPartnerManager) {
      throw new ForbiddenException("Недостаточно прав для подтверждения");
    }

    const managerId = isSuperAdmin ? data.responsible_manager_id : actor.id;
    if (!managerId) {
      throw new BadRequestException("Выберите ответственного менеджера");
    }
    await this.assertPartnerManager(managerId);

    const now = new Date();
    const recipients = await this.getCompanyAdminRecipients(company);
    await this.dataSource.transaction(async (entityManager) => {
      const result = await entityManager
        .getRepository(CompanyEntity)
        .createQueryBuilder()
        .update()
        .set({
          status: CompanyStatus.Accept,
          responsible_manager_id: managerId,
          approved_by_user_id: actor.id,
          approved_at: now,
          validated_by_manager_id: actor.id,
          validated_at: now,
        })
        .where("id = :id AND status = :status AND review_locked_at IS NULL", {
          id,
          status: CompanyStatus.Pending,
        })
        .execute();

      if (result.affected !== 1) {
        throw new ConflictException("Состояние заявки уже изменилось");
      }

      await entityManager.getRepository(UserEntity).update(company.owner_id, {
        is_activated: true,
        manager_id: managerId,
      });
      await entityManager.getRepository(CompanyEmployeeEntity).update(
        { company_id: company.id, employee_id: company.owner_id },
        { status: CompanyEmployeeStatus.Accept },
      );
      const history = await entityManager
        .getRepository(CompanyStatusHistoryEntity)
        .save({
          company_id: company.id,
          action: CompanyLifecycleAction.Approved,
          from_status: CompanyStatus.Pending,
          to_status: CompanyStatus.Accept,
          actor_user_id: actor.id,
          responsible_manager_id: managerId,
        });
      await this.companyNotifications.enqueue(entityManager, {
        companyId: company.id,
        historyId: history.id,
        recipients: this.toNotificationRecipients(recipients),
        email: {
          subject: "Подтверждение регистрации!",
          template: "request-company-approve",
          context: {
            link: "https://partner.trinity.ru/",
            companyName: company.name,
          },
        },
        site: {
          title: "Компания подтверждена",
          text: `Компания «${company.name}» подтверждена Тринити.`,
          actions: [{ label: "Перейти на портал", url: "/dashboard" }],
        },
      });
    });

    await this.companyNotifications.flushCompany(company.id);
    return this.detail(id, actor);
  }

  async lockReview(
    id: number,
    actor: UserEntity,
    data: CompanyRestrictionReasonRequestDto,
  ) {
    this.assertSuperAdmin(actor);
    const company = await this.findCompany(id);
    if (company.status !== CompanyStatus.Pending) {
      throw new ConflictException(
        "Заблокировать можно только заявку на проверке",
      );
    }
    if (company.review_locked_at) {
      throw new ConflictException("Заявка уже заблокирована");
    }

    const now = new Date();
    const recipients = await this.getCompanyAdminRecipients(company);
    await this.dataSource.transaction(async (entityManager) => {
      const result = await entityManager
        .getRepository(CompanyEntity)
        .createQueryBuilder()
        .update()
        .set({
          review_locked_at: now,
          review_locked_by_user_id: actor.id,
          review_lock_reason: data.reason,
        })
        .where("id = :id AND status = :status AND review_locked_at IS NULL", {
          id,
          status: CompanyStatus.Pending,
        })
        .execute();
      if (result.affected !== 1) {
        throw new ConflictException("Состояние заявки уже изменилось");
      }
      const history = await entityManager
        .getRepository(CompanyStatusHistoryEntity)
        .save({
          company_id: id,
          action: CompanyLifecycleAction.ReviewLocked,
          from_status: CompanyStatus.Pending,
          to_status: CompanyStatus.Pending,
          actor_user_id: actor.id,
          reason: data.reason,
        });
      await this.companyNotifications.enqueue(entityManager, {
        companyId: company.id,
        historyId: history.id,
        recipients: this.toNotificationRecipients(recipients),
        email: this.restrictedEmailPayload(
          company,
          data.reason,
          "заблокирован",
        ),
        site: {
          title: "Доступ компании ограничен",
          text: `Компания «${company.name}»: ${data.reason}`,
          actions: [{ label: "Подробнее", url: "/partner.plug" }],
        },
      });
    });

    await this.companyNotifications.flushCompany(company.id);
    return this.detail(id, actor);
  }

  async unlockReview(id: number, actor: UserEntity) {
    this.assertSuperAdmin(actor);
    const company = await this.findCompany(id);
    if (company.status !== CompanyStatus.Pending || !company.review_locked_at) {
      throw new ConflictException("Заявка не заблокирована");
    }

    const recipients = await this.getCompanyAdminRecipients(company);
    await this.dataSource.transaction(async (entityManager) => {
      const result = await entityManager
        .getRepository(CompanyEntity)
        .createQueryBuilder()
        .update()
        .set({
          review_locked_at: null,
          review_locked_by_user_id: null,
          review_lock_reason: null,
        })
        .where("id = :id AND status = :status AND review_locked_at IS NOT NULL", {
          id,
          status: CompanyStatus.Pending,
        })
        .execute();
      if (result.affected !== 1) {
        throw new ConflictException("Состояние заявки уже изменилось");
      }
      const history = await entityManager
        .getRepository(CompanyStatusHistoryEntity)
        .save({
          company_id: id,
          action: CompanyLifecycleAction.ReviewUnlocked,
          from_status: CompanyStatus.Pending,
          to_status: CompanyStatus.Pending,
          actor_user_id: actor.id,
        });
      await this.companyNotifications.enqueue(entityManager, {
        companyId: company.id,
        historyId: history.id,
        recipients: this.toNotificationRecipients(recipients),
        email: {
          subject: "Блокировка заявки снята",
          template: "company-access-restored",
          context: {
            companyName: company.name,
            message: "Заявка снова находится на проверке у Тринити.",
          },
        },
        site: {
          title: "Блокировка заявки снята",
          text: `Заявка компании «${company.name}» снова находится на проверке.`,
          actions: [{ label: "Подробнее", url: "/partner.plug" }],
        },
      });
    });

    await this.companyNotifications.flushCompany(company.id);
    return this.detail(id, actor);
  }

  async suspend(
    id: number,
    actor: UserEntity,
    data: CompanyRestrictionReasonRequestDto,
  ) {
    const company = await this.findCompany(id);
    if (company.status !== CompanyStatus.Accept) {
      throw new ConflictException(
        "Приостановить можно только активную компанию",
      );
    }
    this.assertCanManageAssignedCompany(company, actor);

    const now = new Date();
    const recipients = await this.getCompanyAdminRecipients(company);
    await this.dataSource.transaction(async (entityManager) => {
      const result = await entityManager
        .getRepository(CompanyEntity)
        .createQueryBuilder()
        .update()
        .set({
          status: CompanyStatus.Suspended,
          suspended_at: now,
          suspended_by_user_id: actor.id,
          suspension_reason: data.reason,
        })
        .where("id = :id AND status = :status", {
          id,
          status: CompanyStatus.Accept,
        })
        .execute();
      if (result.affected !== 1) {
        throw new ConflictException("Состояние компании уже изменилось");
      }
      await entityManager.getRepository(UserEntity).update(company.owner_id, {
        is_activated: false,
      });
      const history = await entityManager
        .getRepository(CompanyStatusHistoryEntity)
        .save({
          company_id: id,
          action: CompanyLifecycleAction.Suspended,
          from_status: CompanyStatus.Accept,
          to_status: CompanyStatus.Suspended,
          actor_user_id: actor.id,
          responsible_manager_id: company.responsible_manager_id,
          reason: data.reason,
        });
      await this.companyNotifications.enqueue(entityManager, {
        companyId: company.id,
        historyId: history.id,
        recipients: this.toNotificationRecipients(recipients),
        email: this.restrictedEmailPayload(
          company,
          data.reason,
          "приостановлен",
        ),
        site: {
          title: "Доступ компании ограничен",
          text: `Компания «${company.name}»: ${data.reason}`,
          actions: [{ label: "Подробнее", url: "/partner.plug" }],
        },
      });
    });

    await this.companyNotifications.flushCompany(company.id);
    return this.detail(id, actor);
  }

  async resume(id: number, actor: UserEntity) {
    const company = await this.findCompany(id);
    if (company.status !== CompanyStatus.Suspended) {
      throw new ConflictException(
        "Возобновить можно только приостановленную компанию",
      );
    }
    this.assertCanManageAssignedCompany(company, actor);

    const recipients = await this.getCompanyAdminRecipients(company);
    await this.dataSource.transaction(async (entityManager) => {
      const result = await entityManager
        .getRepository(CompanyEntity)
        .createQueryBuilder()
        .update()
        .set({
          status: CompanyStatus.Accept,
          suspended_at: null,
          suspended_by_user_id: null,
          suspension_reason: null,
        })
        .where("id = :id AND status = :status", {
          id,
          status: CompanyStatus.Suspended,
        })
        .execute();
      if (result.affected !== 1) {
        throw new ConflictException("Состояние компании уже изменилось");
      }
      await entityManager.getRepository(UserEntity).update(company.owner_id, {
        is_activated: true,
      });
      const history = await entityManager
        .getRepository(CompanyStatusHistoryEntity)
        .save({
          company_id: id,
          action: CompanyLifecycleAction.Resumed,
          from_status: CompanyStatus.Suspended,
          to_status: CompanyStatus.Accept,
          actor_user_id: actor.id,
          responsible_manager_id: company.responsible_manager_id,
        });
      await this.companyNotifications.enqueue(entityManager, {
        companyId: company.id,
        historyId: history.id,
        recipients: this.toNotificationRecipients(recipients),
        email: {
          subject: "Доступ компании возобновлён",
          template: "company-access-restored",
          context: {
            companyName: company.name,
            message: "Доступ к партнерскому порталу Тринити восстановлен.",
          },
        },
        site: {
          title: "Доступ компании возобновлён",
          text: `Доступ компании «${company.name}» к порталу восстановлен.`,
          actions: [{ label: "Открыть портал", url: "/dashboard" }],
        },
      });
    });

    await this.companyNotifications.flushCompany(company.id);
    return this.detail(id, actor);
  }

  async assignManager(
    id: number,
    actor: UserEntity,
    data: AssignCompanyManagerRequestDto,
  ) {
    this.assertSuperAdmin(actor);
    const company = await this.findCompany(id);
    await this.assertPartnerManager(data.responsible_manager_id);

    await this.dataSource.transaction(async (entityManager) => {
      await entityManager.getRepository(CompanyEntity).update(id, {
        responsible_manager_id: data.responsible_manager_id,
      });
      await entityManager.getRepository(UserEntity).update(company.owner_id, {
        manager_id: data.responsible_manager_id,
      });
      await entityManager.getRepository(CompanyStatusHistoryEntity).save({
        company_id: id,
        action: CompanyLifecycleAction.ManagerAssigned,
        from_status: company.status,
        to_status: company.status,
        actor_user_id: actor.id,
        responsible_manager_id: data.responsible_manager_id,
        details: {
          previous_responsible_manager_id:
            company.responsible_manager_id || null,
        },
      });
    });

    return this.detail(id, actor);
  }

  async updateOwnContacts(
    actor: UserEntity,
    data: UpdateCompanyContactsRequestDto,
  ) {
    const company = await this.findOwnCompany(actor.id);
    if (!company) throw new NotFoundException("Компания пользователя не найдена");
    if (company.status !== CompanyStatus.Accept) {
      throw new ForbiddenException(
        "Контакты можно редактировать только у активной компании",
      );
    }

    const isOwner = company.owner_id === actor.id;
    const isCompanyAdmin = this.getRoleNames(actor).includes(
      RoleTypes.CompanyAdmin,
    );
    if (!isOwner && !isCompanyAdmin) {
      throw new ForbiddenException("Недостаточно прав для изменения контактов");
    }
    if (!Object.keys(data).length) {
      throw new BadRequestException("Не переданы поля контактов");
    }

    const oldValues = {
      contact_email: company.contact_email,
      contact_phone: company.contact_phone,
      site_url: company.site_url,
      company_business_line: company.company_business_line,
    };

    await this.dataSource.transaction(async (entityManager) => {
      await entityManager.getRepository(CompanyEntity).update(company.id, data);
      await entityManager.getRepository(CompanyStatusHistoryEntity).save({
        company_id: company.id,
        action: CompanyLifecycleAction.ContactsUpdated,
        from_status: company.status,
        to_status: company.status,
        actor_user_id: actor.id,
        details: { old: oldValues, new: data },
      });
    });

    return this.ownCompany(actor);
  }

  private createCompanyQuery(actor: UserEntity) {
    const query = this.companyRepository
      .createQueryBuilder("company")
      .leftJoinAndMapOne(
        "company.owner",
        "users",
        "owner",
        "owner.id = company.owner_id",
      )
      .leftJoinAndMapOne(
        "owner.user_info",
        "users_info",
        "owner_info",
        "owner_info.user_id = owner.id",
      )
      .leftJoinAndMapOne(
        "company.responsible_manager",
        "users",
        "responsible_manager",
        "responsible_manager.id = company.responsible_manager_id",
      )
      .leftJoinAndMapOne(
        "responsible_manager.user_info",
        "users_info",
        "responsible_manager_info",
        "responsible_manager_info.user_id = responsible_manager.id",
      )
      .leftJoinAndMapOne(
        "company.approved_by_user",
        "users",
        "approved_by_user",
        "approved_by_user.id = company.approved_by_user_id",
      )
      .leftJoinAndMapOne(
        "approved_by_user.user_info",
        "users_info",
        "approved_by_info",
        "approved_by_info.user_id = approved_by_user.id",
      );

    const roles = this.getRoleNames(actor);
    if (
      !roles.includes(RoleTypes.SuperAdmin) &&
      !roles.includes(RoleTypes.TechnicalSpecialist)
    ) {
      if (!roles.includes(RoleTypes.PartnerManager)) {
        throw new ForbiddenException("Нет доступа к списку компаний");
      }
      query.andWhere(
        "(company.responsible_manager_id = :actorId OR company.status = :pendingStatus)",
        { actorId: actor.id, pendingStatus: CompanyStatus.Pending },
      );
    }

    return query;
  }

  private async findCompany(id: number): Promise<CompanyEntity> {
    const company = await this.createUnscopedCompanyQuery()
      .where("company.id = :id", { id })
      .getOne();
    if (!company) throw new NotFoundException("Компания не найдена");
    return company;
  }

  private async findOwnCompany(userId: number): Promise<CompanyEntity | null> {
    return this.createUnscopedCompanyQuery()
      .leftJoin(
        "company_employees",
        "current_company_employee",
        `current_company_employee.company_id = company.id
          AND current_company_employee.status IN (:...ownCompanyStatuses)`,
        {
          ownCompanyStatuses: [
            CompanyEmployeeStatus.Accept,
            CompanyEmployeeStatus.Blocked,
          ],
        },
      )
      .where(
        "(company.owner_id = :userId OR current_company_employee.employee_id = :userId)",
        { userId },
      )
      .orderBy("current_company_employee.id", "DESC")
      .getOne();
  }

  private createUnscopedCompanyQuery() {
    return this.companyRepository
      .createQueryBuilder("company")
      .leftJoinAndSelect("company.owner", "owner")
      .leftJoinAndSelect("owner.user_info", "owner_info")
      .leftJoinAndSelect(
        "company.responsible_manager",
        "responsible_manager",
      )
      .leftJoinAndSelect(
        "responsible_manager.user_info",
        "responsible_manager_info",
      )
      .leftJoinAndSelect("company.approved_by_user", "approved_by_user")
      .leftJoinAndSelect("approved_by_user.user_info", "approved_by_info");
  }

  private assertCanView(company: CompanyEntity, actor: UserEntity) {
    const roles = this.getRoleNames(actor);
    if (
      roles.includes(RoleTypes.SuperAdmin) ||
      roles.includes(RoleTypes.TechnicalSpecialist)
    ) {
      return;
    }
    if (
      roles.includes(RoleTypes.PartnerManager) &&
      (company.status === CompanyStatus.Pending ||
        company.responsible_manager_id === actor.id)
    ) {
      return;
    }
    throw new ForbiddenException("Нет доступа к этой компании");
  }

  private assertCanManageAssignedCompany(
    company: CompanyEntity,
    actor: UserEntity,
  ) {
    const roles = this.getRoleNames(actor);
    if (roles.includes(RoleTypes.SuperAdmin)) return;
    if (
      roles.includes(RoleTypes.PartnerManager) &&
      company.responsible_manager_id === actor.id
    ) {
      return;
    }
    throw new ForbiddenException(
      "Действие доступно только Админу или ответственному менеджеру",
    );
  }

  private async assertPartnerManager(userId: number) {
    const user = await this.userRepository.findByIdWithPermissions(userId);
    if (
      !user ||
      !user.is_activated ||
      !this.getRoleNames(user).includes(RoleTypes.PartnerManager)
    ) {
      throw new BadRequestException(
        "Ответственным можно назначить только активного менеджера",
      );
    }
  }

  private getCapabilities(
    company: CompanyEntity,
    actor: UserEntity,
    ownCompany = false,
  ): CompanyCapabilitiesDto {
    const roles = this.getRoleNames(actor);
    const isSuperAdmin = roles.includes(RoleTypes.SuperAdmin);
    const isPartnerManager = roles.includes(RoleTypes.PartnerManager);
    const isResponsible =
      isPartnerManager && company.responsible_manager_id === actor.id;
    const canApprove =
      company.status === CompanyStatus.Pending &&
      !company.review_locked_at &&
      (isSuperAdmin || isPartnerManager);

    return {
      can_approve: canApprove,
      can_lock_review:
        isSuperAdmin &&
        company.status === CompanyStatus.Pending &&
        !company.review_locked_at,
      can_unlock_review:
        isSuperAdmin &&
        company.status === CompanyStatus.Pending &&
        Boolean(company.review_locked_at),
      can_suspend:
        company.status === CompanyStatus.Accept &&
        (isSuperAdmin || isResponsible),
      can_resume:
        company.status === CompanyStatus.Suspended &&
        (isSuperAdmin || isResponsible),
      can_edit_contacts:
        ownCompany &&
        company.status === CompanyStatus.Accept &&
        (company.owner_id === actor.id ||
          roles.includes(RoleTypes.CompanyAdmin)),
      can_assign_manager: isSuperAdmin,
    };
  }

  private async getCompanyStats(
    companyIds: number[],
  ): Promise<Map<number, CompanyStats>> {
    const result = new Map<number, CompanyStats>();
    companyIds.forEach((id) =>
      result.set(id, {
        employees: 0,
        deals: { total: 0, active: 0, completed: 0 },
      }),
    );
    if (!companyIds.length) return result;

    const employeeCounts = await this.companyEmployeeRepository
      .createQueryBuilder("company_employee")
      .select("company_employee.company_id", "company_id")
      .addSelect("COUNT(DISTINCT company_employee.employee_id)", "count")
      .where("company_employee.company_id IN (:...companyIds)", { companyIds })
      .andWhere("company_employee.status = :status", {
        status: CompanyEmployeeStatus.Accept,
      })
      .groupBy("company_employee.company_id")
      .getRawMany();

    const dealCounts = await this.companyRepository
      .createQueryBuilder("stats_company")
      .leftJoin(
        "company_employees",
        "stats_employee",
        "stats_employee.company_id = stats_company.id AND stats_employee.status = :acceptedEmployee",
        { acceptedEmployee: CompanyEmployeeStatus.Accept },
      )
      .leftJoin(
        "deals",
        "stats_deal",
        `(stats_deal.creator_company_id = stats_company.id
          OR stats_deal.integrator_company_id = stats_company.id
          OR stats_deal.distributor_company_id = stats_company.id)
          AND stats_deal.deleted_at IS NULL`,
      )
      .select("stats_company.id", "company_id")
      .addSelect("COUNT(DISTINCT stats_deal.id)", "total")
      .addSelect(
        "COUNT(DISTINCT CASE WHEN stats_deal.status IN (:...activeStatuses) THEN stats_deal.id END)",
        "active",
      )
      .addSelect(
        "COUNT(DISTINCT CASE WHEN stats_deal.status IN (:...completedStatuses) THEN stats_deal.id END)",
        "completed",
      )
      .where("stats_company.id IN (:...companyIds)", { companyIds })
      .setParameter("activeStatuses", [
        DealStatus.Moderation,
        DealStatus.Registered,
      ])
      .setParameter("completedStatuses", [
        DealStatus.Win,
        DealStatus.Lose,
        DealStatus.Canceled,
      ])
      .groupBy("stats_company.id")
      .getRawMany();

    employeeCounts.forEach((row) => {
      const companyId = Number(row.company_id);
      const current = result.get(companyId);
      if (current) current.employees = Number(row.count) || 0;
    });
    dealCounts.forEach((row) => {
      const companyId = Number(row.company_id);
      const current = result.get(companyId);
      if (current) {
        current.deals = {
          total: Number(row.total) || 0,
          active: Number(row.active) || 0,
          completed: Number(row.completed) || 0,
        };
      }
    });
    return result;
  }

  private toListItem(
    company: CompanyEntity,
    actor: UserEntity,
    stats?: CompanyStats,
  ): CompanyListItemResponseDto {
    return {
      id: company.id,
      name: company.name,
      inn: company.inn,
      partnership_type: company.partnership_type,
      status: company.status,
      status_label: this.getStatusLabel(company.status),
      is_review_locked: Boolean(company.review_locked_at),
      responsible_manager: this.toManager(company.responsible_manager),
      employees_count: stats?.employees || 0,
      deals: stats?.deals || { total: 0, active: 0, completed: 0 },
      capabilities: this.getCapabilities(company, actor),
    };
  }

  private toDetail(
    company: CompanyEntity,
    actor: UserEntity,
    stats?: CompanyStats,
    ownCompany = false,
  ): CompanyDetailResponseDto {
    return {
      ...this.toListItem(company, actor, stats),
      contact_email: company.contact_email || null,
      contact_phone: company.contact_phone || null,
      site_url: company.site_url || null,
      company_business_line: company.company_business_line || null,
      restriction_reason:
        company.review_lock_reason || company.suspension_reason || null,
      approved_at: company.approved_at || null,
      approved_by: this.toManager(company.approved_by_user),
      capabilities: this.getCapabilities(company, actor, ownCompany),
    };
  }

  private toManager(user?: UserEntity | null): CompanyManagerSummaryDto | null {
    if (!user) return null;
    const name =
      [user.user_info?.first_name, user.user_info?.last_name]
        .filter(Boolean)
        .join(" ") || user.email;
    return { id: user.id, name, email: user.email };
  }

  private getRoleNames(user: Partial<UserEntity>): string[] {
    return [
      user.role?.name,
      ...(user.roles || []).map((role) => role.name),
      ...(user.user_roles || []).map((entry) => entry.role?.name),
    ].filter(Boolean);
  }

  private assertSuperAdmin(actor: UserEntity): void {
    if (!this.getRoleNames(actor).includes(RoleTypes.SuperAdmin)) {
      throw new ForbiddenException("Действие доступно только администратору");
    }
  }

  private getStatusLabel(status: CompanyStatus) {
    const labels: Partial<Record<CompanyStatus, string>> = {
      [CompanyStatus.Pending]: "На проверке",
      [CompanyStatus.Accept]: "Активна",
      [CompanyStatus.Suspended]: "Приостановлена",
    };
    return labels[status] || status;
  }

  private restrictedEmailPayload(
    company: CompanyEntity,
    reason: string,
    accessState: string,
  ) {
    const manager = company.responsible_manager;
    return {
      subject: "Доступ к партнерскому порталу Тринити ограничен",
      template: "company-access-limited",
      context: {
        companyName: company.name,
        accessState,
        reason,
        managerName:
          this.toManager(manager)?.name || "Менеджер Тринити не назначен",
        managerPhone: manager?.user_info?.phone || "Телефон не указан",
        managerEmail: manager?.email || "support@trinity.ru",
      },
    };
  }

  private async getCompanyAdminRecipients(company: CompanyEntity) {
    const owner = await this.userRepository.findById(company.owner_id);
    const employees =
      await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(
        company.id,
      );
    const recipients = [
      owner,
      ...employees
        .filter(
          (entry) =>
            entry.status === CompanyEmployeeStatus.Accept &&
            this.getRoleNames(entry.employee).includes(RoleTypes.CompanyAdmin),
        )
        .map((entry) => entry.employee),
    ].filter(Boolean) as UserEntity[];

    return Array.from(
      new Map(recipients.map((recipient) => [recipient.id, recipient])).values(),
    );
  }

  private toNotificationRecipients(
    recipients: UserEntity[],
  ): CompanyNotificationRecipient[] {
    return recipients.map((recipient) => ({
      userId: recipient.id,
      email: recipient.email,
    }));
  }
}
