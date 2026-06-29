import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CreateDealDto } from "./dto/request/create-deal.dto";
import {
  CompanyRepository,
  CustomerRepository,
  DealRepository,
  DistributorRepository,
  DealDeletionRequestRepository,
  CompanyEmployeeRepository,
  ConfiguratorDraftRepository,
} from "@orm/repositories";
import { RoleTypes } from "@app/types/RoleTypes";
import {
  CompanyEmployeeStatus,
  DealDuplicateReviewStatus,
  DealStatus,
  DealStatusRu,
  DealType,
  NotificationCategory,
  UserEntity,
  Bitrix24SyncStatus,
} from "@orm/entities";
import { CompanyEntity, PartnershipType } from "@orm/entities/company.entity";
import { SearchDealDto } from "./dto/request/search-deal.dto";
import { DealStatisticsResponseDto } from "./dto/response/deal-statistics-response.dto";
import { Bitrix24Service } from "../../integrations/bitrix24/bitrix24.service";
import { UserRepository } from "src/orm/repositories/user.repository";
import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { CreateDealDeletionRequestDto } from "./dto/request/create-deal-deletion-request.dto";
import { ProcessDealDeletionRequestDto } from "./dto/request/process-deal-deletion-request.dto";
import {
  DealDeletionStatus,
  DealDeletionRequestEntity,
} from "@orm/entities/deal-deletion-request.entity";
import { DealDeletionRequestResponseDto } from "./dto/response/deal-deletion-request-response.dto";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "@api/notification/notification.service";
import { AddDealConfigurationsDto } from "./dto/request/add-deal-configurations.dto";
import { UpdateDealDto } from "./dto/request/update-deal.dto";
import { AddDealAttachmentDto } from "./dto/request/add-deal-attachment.dto";
import { AddDealCommentDto } from "./dto/request/add-deal-comment.dto";

@Injectable()
export class DealService {
  private readonly logger = new Logger(DealService.name);

  constructor(
    private readonly distributorRepository: DistributorRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly dealRepository: DealRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly bitrix24Service: Bitrix24Service,
    private readonly userRepository: UserRepository,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly dealDeletionRequestRepository: DealDeletionRequestRepository,
    private readonly companyEmployeeRepository: CompanyEmployeeRepository,
    private readonly configuratorDraftRepository: ConfiguratorDraftRepository,
    private configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  private get hostname(): string {
    return this.configService.get<string>("HOSTNAME") || "localhost";
  }

  private get frontendHostname(): string {
    return this.configService.get<string>("FRONTEND_HOSTNAME") || this.hostname;
  }

  private getDealUrl(dealId: number): string {
    const hostname = this.frontendHostname;
    const baseUrl = /^https?:\/\//.test(hostname)
      ? hostname
      : `https://${hostname}`;

    return `${baseUrl.replace(/\/$/, "")}/deals.management/${dealId}`;
  }

  private hasRole(user: UserEntity, roleName: string): boolean {
    if (user.role?.name === roleName) {
      return true;
    }
    return user.roles?.some(role => role.name === roleName) || false;
  }

  private hasAnyRole(user: UserEntity, roleNames: RoleTypes[]) {
    return roleNames.some((roleName) => this.hasRole(user, roleName));
  }

  private isSuperAdmin(user: UserEntity): boolean {
    return this.hasRole(user, RoleTypes.SuperAdmin);
  }

  async getCount(): Promise<number> {
    return await this.dealRepository.count();
  }

  async getCountByStatus(status: DealStatus): Promise<number> {
    return await this.dealRepository.count({ where: { status } });
  }

  async getAllCount(): Promise<number> {
    return await this.dealRepository.count();
  }

  async getModerationCount(): Promise<number> {
    return await this.dealRepository.count({
      where: { status: DealStatus.Moderation },
    });
  }

  async getRegisteredCount(): Promise<number> {
    return await this.dealRepository.count({
      where: { status: DealStatus.Registered },
    });
  }

  async getCanceledCount(): Promise<number> {
    return await this.dealRepository.count({
      where: { status: DealStatus.Canceled },
    });
  }

  async getWinCount(): Promise<number> {
    return await this.dealRepository.count({
      where: { status: DealStatus.Win },
    });
  }

  async getLooseCount(): Promise<number> {
    return await this.dealRepository.count({
      where: { status: DealStatus.Lose },
    });
  }

  async getRequestDeletedCount(): Promise<number> {
    return await this.dealDeletionRequestRepository.count({
      where: { status: DealDeletionStatus.PENDING },
    });
  }

  async create(auth_user: UserEntity, createDealDto: CreateDealDto) {
    const authUserCompany = await this.getUserCompany(auth_user);
    const distributor =
      authUserCompany?.partnership_type === PartnershipType.Distributor
        ? await this.findDistributorForCompany(authUserCompany)
        : createDealDto.distributor_id
          ? await this.distributorRepository.findById(
              createDealDto.distributor_id,
            )
          : null;
    let integratorCompany =
      authUserCompany?.partnership_type === PartnershipType.Integrator
        ? authUserCompany
        : createDealDto.integrator_company_id
          ? await this.companyRepository.findById(createDealDto.integrator_company_id)
          : null;
    const requestedIntegratorInn = `${createDealDto.integrator_inn || ""}`.trim();
    const requestedIntegratorName = `${createDealDto.integrator_name || ""}`.trim();

    if (!integratorCompany && requestedIntegratorInn) {
      integratorCompany = await this.companyRepository.findOne({
        where: {
          inn: requestedIntegratorInn,
          partnership_type: PartnershipType.Integrator,
        },
      });
    }

    const existingCustomer = await this.customerRepository.findSimilar(
      createDealDto.customer.inn,
      createDealDto.customer.email,
      createDealDto.customer.first_name,
      createDealDto.customer.last_name,
    );
    const duplicateInnDeal = await this.findExistingDealByCustomerInn(
      createDealDto.customer.inn,
    );

    const customer =
      existingCustomer ||
      (await this.customerRepository.save(createDealDto.customer));

    if (!distributor) {
      throw new HttpException(
        "Укажите дистрибьютора сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    createDealDto.distributor_id = distributor.id;

    if (
      integratorCompany &&
      integratorCompany.partnership_type !== PartnershipType.Integrator
    ) {
      throw new HttpException(
        "Укажите интегратора сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    const integratorName = integratorCompany?.name || requestedIntegratorName;
    const integratorInn = integratorCompany?.inn || requestedIntegratorInn;

    if (!integratorName || !integratorInn) {
      throw new HttpException(
        "Укажите название и ИНН интегратора",
        HttpStatus.FORBIDDEN,
      );
    }

    const bitrix24IntegratorContactId =
      await this.bitrix24Service.findOrCreateIntegratorContact({
        name: integratorName,
        inn: integratorInn,
      });

    if (!customer) {
      throw new HttpException(
        "Произошла ошибка при создании заказчика",
        HttpStatus.FORBIDDEN,
      );
    }

    const countDealsInDay = await this.dealRepository.countDealsForToday();
    const date = new Date();
    const dealTitleDate = `${String(date.getDate()).padStart(2, "0")}.${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}.${date.getFullYear()}`;
    createDealDto.title =
      createDealDto.title?.trim() ||
      `${customer.company_name || "Новый заказчик"} ${dealTitleDate}`;

    const deal_num = `${auth_user.id}-${date.getFullYear()}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date
      .getDate()
      .toString()
      .padStart(2, "0")}-${countDealsInDay + 1}`;

    createDealDto.purchase_date = new Date(createDealDto.purchase_date);

    const dealData = {
      ...createDealDto,
      customer_id: customer.id,
      creator_id: auth_user.id,
      deal_num,
      distributor_id: distributor.id,
      integrator_company_id: integratorCompany?.id || null,
      integrator_name: integratorName,
      integrator_inn: integratorInn,
      bitrix24_integrator_contact_id: bitrix24IntegratorContactId,
      deal_type: this.isTrinityStaffDealCreator(auth_user)
        ? DealType.TrinityStaff
        : DealType.Partner,
      duplicate_of_deal_id: duplicateInnDeal?.id || null,
      duplicate_review_status: duplicateInnDeal
        ? DealDuplicateReviewStatus.Pending
        : null,
    };

    if (dealData.customer_id) {
      delete dealData.customer;
    }

    const savedDeal = await this.dealRepository.save(dealData);
    await this.linkConfiguratorDraftsToDeal(
      createDealDto.configurations,
      savedDeal.id,
      auth_user.id,
    );

    this.sendLeadToBitrix24(savedDeal, customer, distributor, auth_user).catch(
      (error) => {
        this.logger.error(
          `Ошибка отправки лида для сделки ${savedDeal.id} в Bitrix24:`,
          error,
        );
      },
    );

    await this.notifyAdminsAboutNewDeal(
      savedDeal,
      customer,
      distributor,
      auth_user,
    );
    await this.notifyCounterpartyAdminsAboutNewDeal(
      savedDeal,
      authUserCompany,
      distributor,
      integratorCompany,
      integratorName,
      integratorInn,
    );
    await this.notifyManagerAboutDuplicateCustomerInn(
      savedDeal,
      duplicateInnDeal,
      auth_user,
    );

    return savedDeal;
  }

  private async linkConfiguratorDraftsToDeal(
    configurations: CreateDealDto["configurations"],
    dealId: number,
    creatorId: number,
  ) {
    const draftIds = Array.from(
      new Set(
        (configurations || [])
          .map((config) => Number(config.meta?.draftId))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    if (!draftIds.length) return;

    await this.configuratorDraftRepository
      .createQueryBuilder()
      .update()
      .set({ deal_id: dealId })
      .where("id IN (:...draftIds)", { draftIds })
      .andWhere("creator_id = :creatorId", { creatorId })
      .execute();
  }

  private isTrinityStaffDealCreator(user: UserEntity) {
    return this.hasAnyRole(user, [
      RoleTypes.SuperAdmin,
      RoleTypes.ContentManager,
    ]);
  }

  private async findExistingDealByCustomerInn(inn?: string) {
    const normalizedInn = `${inn || ""}`.trim();
    if (!normalizedInn) return null;

    return this.dealRepository
      .createQueryBuilder("deal")
      .leftJoinAndSelect("deal.customer", "customer")
      .where("customer.inn = :inn", { inn: normalizedInn })
      .orderBy("deal.created_at", "DESC")
      .getOne();
  }

  private async notifyManagerAboutDuplicateCustomerInn(
    newDeal: any,
    similarDeal: any,
    creator: UserEntity,
  ) {
    if (!similarDeal || similarDeal.id === newDeal.id) return;

    const creatorWithManager = await this.userRepository.findByIdWithUserInfo(
      creator.id,
    );
    const managerId = creatorWithManager?.manager_id || creatorWithManager?.manager?.id;

    if (!managerId) return;

    await this.notificationService.send({
      user_id: managerId,
      title: "Найдена сделка с совпадающим ИНН заказчика",
      text: `При создании сделки ${newDeal.deal_num} найден похожий заказчик по ИНН в сделке ${similarDeal.deal_num}. Проверьте, не является ли это дублем.`,
      category: NotificationCategory.Deal,
      actions: [
        {
          label: "Новая сделка",
          url: `/deals.management/${newDeal.id}`,
        },
        {
          label: "Похожая сделка",
          url: `/deals.management/${similarDeal.id}`,
        },
      ],
    });
  }

  private async notifyAdminsAboutNewDeal(
    deal: any,
    customer: any,
    distributor: any,
    creator: UserEntity,
  ) {
    try {
      const creatorWithInfo = await this.userRepository.findByIdWithUserInfo(
        creator.id,
      );
  
      await this.emailConfirmerService.emailSend({
        email: "partner@trinity.ru",
        subject: "Создана новая сделка",
        template: "admin-new-deal-notification",
        context: {
          adminName: "Администратор",
          dealNumber: deal.deal_num,
          dealId: deal.id,
          customerFirstName: customer.first_name,
          customerLastName: customer.last_name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          distributorName: distributor.name,
          distributorId: distributor.id,
          creatorName:
            creatorWithInfo.user_info?.first_name &&
            creatorWithInfo.user_info?.last_name
              ? `${creatorWithInfo.user_info.first_name} ${creatorWithInfo.user_info.last_name}`
              : creatorWithInfo.email,
          creatorEmail: creatorWithInfo.email,
          creationDate: new Date().toLocaleDateString("ru-RU"),
          purchaseDate: deal.purchase_date
            ? new Date(deal.purchase_date).toLocaleDateString("ru-RU")
            : null,
          amount: deal.amount,
          status: deal.status,
          description: deal.description,
        },
      });
    } catch (error) {
      console.error(
        "Ошибка отправки уведомления админам о новой сделке:",
        error,
      );
    }
  }

  private async notifyCounterpartyAdminsAboutNewDeal(
    deal: any,
    creatorCompany: CompanyEntity | null,
    distributor: any,
    integratorCompany: CompanyEntity | null,
    integratorName: string,
    integratorInn: string,
  ) {
    if (!creatorCompany) return;

    let recipientCompanyId: number | null = null;
    let title = "";

    if (creatorCompany.partnership_type === PartnershipType.Distributor) {
      if (!integratorCompany) {
        await this.notifyResponsibleManagerAboutUnregisteredIntegrator(
          deal,
          integratorName,
          integratorInn,
        );
        return;
      }

      recipientCompanyId = integratorCompany.id;
      title = `Дистрибьютор ${distributor.name} создал сделку №${deal.deal_num} с вашим участием`;
    }

    if (creatorCompany.partnership_type === PartnershipType.Integrator) {
      const distributorCompany = await this.findDistributorCompanyForDeal({
        distributor,
      });
      recipientCompanyId = distributorCompany?.id || null;
      title = `Интегратор ${creatorCompany.name} создал сделку №${deal.deal_num} с вашим участием`;
    }

    if (!recipientCompanyId || !title) return;

    const recipientIds = await this.getCompanyAdminUserIds(recipientCompanyId);

    await Promise.all(
      recipientIds
        .filter((userId) => userId !== deal.creator_id)
        .map((userId) =>
          this.notificationService.send({
            user_id: userId,
            title,
            text: title,
            category: NotificationCategory.Deal,
            actions: [
              {
                label: "Перейти к сделке",
                url: `/deals.management/${deal.id}`,
              },
            ],
          }),
        ),
      );
  }

  private async notifyResponsibleManagerAboutUnregisteredIntegrator(
    deal: any,
    integratorName: string,
    integratorInn: string,
  ) {
    const creator = await this.userRepository.findOne({
      where: { id: deal.creator_id },
      relations: ["manager"],
    });

    const managerId = creator?.manager_id || creator?.manager?.id;
    if (!managerId) return;

    await this.notificationService.send({
      user_id: managerId,
      title: `В сделке №${deal.deal_num} указан незарегистрированный интегратор`,
      text: `Интегратор: ${integratorName}, ИНН: ${integratorInn}. Контакт Bitrix24: ${deal.bitrix24_integrator_contact_id || "не создан"}.`,
      category: NotificationCategory.Deal,
      actions: [
        {
          label: "Перейти к сделке",
          url: `/deals.management/${deal.id}`,
        },
      ],
    });
  }

  private async sendLeadToBitrix24(
    deal: any,
    customer: any,
    distributor?: any,
    creator?: UserEntity,
  ): Promise<void> {
    try {
      this.logger.log(`Отправка лида для сделки ${deal.id} в Bitrix24...`);

      const distributorName =
        distributor?.name ||
        distributor?.company_name ||
        `Distributor_${deal.distributor_id}`;

      let dealCreator = creator;
      if (!dealCreator && deal.creator_id) {
        dealCreator = await this.userRepository.findByIdWithUserInfo(
          deal.creator_id,
        );
      }

      if (!dealCreator) {
        this.logger.error(`Не удалось найти создателя сделки ${deal.id}`);
        await this.dealRepository.update(deal.id, {
          bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
        });
        return;
      }

      const dealWithPartner = {
        ...deal,
        partner: dealCreator,
        customer: customer,
      };

      const leadId = await this.bitrix24Service.createLead(
        dealWithPartner,
        customer,
        distributorName,
      );

      if (leadId) {
        await this.dealRepository.update(deal.id, {
          bitrix24_deal_id: leadId,
          bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
          bitrix24_synced_at: new Date(),
        });
        this.logger.log(
          `Лид для сделки ${deal.id} успешно создан в Bitrix24 с ID: ${leadId}`,
        );
      } else {
        await this.dealRepository.update(deal.id, {
          bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
        });
        this.logger.warn(
          `Не удалось создать лид для сделки ${deal.id} в Bitrix24`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Ошибка при отправке лида для сделки ${deal.id} в Bitrix24:`,
        error,
      );

      await this.dealRepository.update(deal.id, {
        bitrix24_sync_status: Bitrix24SyncStatus.FAILED,
      });
    }
  }

  async findAll(auth_user: UserEntity, entry?: SearchDealDto) {
    let deals: any[];

    if (this.isSuperAdmin(auth_user)) {
      deals = await this.dealRepository.findDealsWithFilters(entry);
    } else if (this.hasAnyRole(auth_user, [RoleTypes.Staff])) {
      deals = [];
    } else if (
      this.hasAnyRole(auth_user, [
        RoleTypes.EmployeeAdmin,
        RoleTypes.Partner,
        RoleTypes.CompanyAdmin,
        RoleTypes.TechnicalSpecialist,
      ])
    ) {
      const authUserCompany = await this.getUserCompany(auth_user);

      if (
        authUserCompany?.partnership_type === PartnershipType.Distributor &&
        this.isCompanyDealAdmin(auth_user)
      ) {
        const distributor = await this.findDistributorForCompany(
          authUserCompany,
        );

        deals = distributor
          ? await this.dealRepository.findDealsWithFilters({
              ...entry,
              distributorId: distributor.id,
            })
          : [];

        return deals;
      }

      if (
        authUserCompany?.partnership_type === PartnershipType.Integrator &&
        this.isCompanyDealAdmin(auth_user)
      ) {
        deals = await this.dealRepository.findDealsWithFilters(entry);
        return deals.filter((deal) => this.isDealVisibleForCompany(deal, authUserCompany));
      }

      const creatorIds = await this.getRelatedDealCreatorIds(auth_user);
      deals = await this.dealRepository.findDealsWithFilters(
        entry,
        creatorIds,
      );
    } else if (
      this.hasAnyRole(auth_user, [
        RoleTypes.Employee,
        RoleTypes.SalesManager,
      ])
    ) {
      deals = await this.dealRepository.findDealsWithFilters(entry, [
        auth_user.id,
      ]);
    } else {
      deals = [];
    }

    return deals;
  }

  private async getUserCompany(
    auth_user: UserEntity,
  ): Promise<CompanyEntity | null> {
    const ownerCompany = await this.companyRepository.findByOwnerId(
      auth_user.id,
    );

    if (ownerCompany) {
      return ownerCompany;
    }

    const employeeCompany = await this.companyEmployeeRepository.findOne({
      where: {
        employee_id: auth_user.id,
        status: CompanyEmployeeStatus.Accept,
      },
      relations: ["company"],
    });

    return employeeCompany?.company || null;
  }

  private async findDistributorForCompany(company: CompanyEntity) {
    return await this.distributorRepository.findByName(company.name);
  }

  private async getRelatedDealCreatorIds(auth_user: UserEntity) {
    const ids = new Set<number>([auth_user.id]);

    if (auth_user.manager_id) {
      ids.add(auth_user.manager_id);
    }

    const managedUsers = await this.userRepository.find({
      where: { manager_id: auth_user.id },
      select: { id: true },
    });
    managedUsers.forEach((user) => ids.add(user.id));

    const companyIds = new Set<number>();
    const ownerCompany = await this.companyRepository.findByOwnerId(
      auth_user.id,
    );

    if (ownerCompany) {
      companyIds.add(ownerCompany.id);
      ids.add(ownerCompany.owner_id);
    }

    const employeeCompany = await this.companyEmployeeRepository.findOne({
      where: {
        employee_id: auth_user.id,
        status: CompanyEmployeeStatus.Accept,
      },
      relations: ["company"],
    });

    if (employeeCompany) {
      companyIds.add(employeeCompany.company_id);
      if (employeeCompany.company?.owner_id) {
        ids.add(employeeCompany.company.owner_id);
      }
    }

    for (const companyId of companyIds) {
      const company = await this.companyRepository.findById(companyId);
      if (company?.owner_id) {
        ids.add(company.owner_id);
      }

      const employees =
        await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(
          companyId,
        );
      employees
        .filter((employee) => employee.status === CompanyEmployeeStatus.Accept)
        .forEach((employee) => ids.add(employee.employee_id));
    }

    return Array.from(ids);
  }

  async findOne(id: number, auth_user: UserEntity) {
    const deal = await this.dealRepository.findById(id);

    if (!deal) {
      throw new HttpException("Сделка не найдена", HttpStatus.NOT_FOUND);
    }

    if (this.isSuperAdmin(auth_user)) {
      return Object.assign(deal, {
        can_update_status: await this.canUpdateDealStatus(deal, auth_user),
        can_update_fields: await this.canUpdateDealFields(deal, auth_user),
        can_update_configurations: this.canUpdateDealConfigurations(
          deal,
          auth_user,
        ),
      });
    }

    if (this.hasAnyRole(auth_user, [RoleTypes.Staff])) {
      throw new HttpException(
        "У вас недостаточно прав для получения деталей данной сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      this.hasAnyRole(auth_user, [
        RoleTypes.EmployeeAdmin,
        RoleTypes.Partner,
        RoleTypes.CompanyAdmin,
        RoleTypes.TechnicalSpecialist,
      ])
    ) {
      const creatorIds = await this.getRelatedDealCreatorIds(auth_user);
      const authUserCompany = await this.getUserCompany(auth_user);
      if (
        creatorIds.includes(deal.creator_id) ||
        (this.isCompanyDealAdmin(auth_user) &&
          this.isDealVisibleForCompany(deal, authUserCompany))
      ) {
        return Object.assign(deal, {
          can_update_status: await this.canUpdateDealStatus(deal, auth_user),
          can_update_fields: await this.canUpdateDealFields(deal, auth_user),
          can_update_configurations: this.canUpdateDealConfigurations(
            deal,
            auth_user,
          ),
        });
      }

      throw new HttpException(
        "У вашей компании недостаточно прав для получения деталей данной сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      this.hasAnyRole(auth_user, [
        RoleTypes.Employee,
        RoleTypes.SalesManager,
      ])
    ) {
      if (deal.creator_id === auth_user.id) {
        return Object.assign(deal, {
          can_update_status: await this.canUpdateDealStatus(deal, auth_user),
          can_update_fields: await this.canUpdateDealFields(deal, auth_user),
          can_update_configurations: this.canUpdateDealConfigurations(
            deal,
            auth_user,
          ),
        });
      }
      throw new HttpException(
        "У вас недостаточно прав для получения деталей данной сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    throw new HttpException(
      "У вас недостаточно прав для получения деталей данной сделки",
      HttpStatus.FORBIDDEN,
    );
  }

  async getDealStatistic(auth_user: UserEntity) {
    const dealsData = await this.findAll(auth_user);
    const statistic: DealStatisticsResponseDto = {
      allCount: dealsData.length,
      canceled: dealsData.filter((el) => el.status === DealStatus.Canceled)
        .length,
      registered: dealsData.filter((el) => el.status === DealStatus.Registered)
        .length,
      moderation: dealsData.filter((el) => el.status === DealStatus.Moderation)
        .length,
      win: dealsData.filter((el) => el.status === DealStatus.Win).length,
      loose: dealsData.filter((el) => el.status === DealStatus.Lose).length,
    };

    return statistic;
  }

  async createDeletionRequest(
    dealId: number,
    auth_user: UserEntity,
    createDeletionRequestDto: CreateDealDeletionRequestDto,
  ): Promise<DealDeletionRequestResponseDto> {
    const deal = await this.findOne(dealId, auth_user);

    if (deal.creator_id !== auth_user.id) {
      throw new HttpException(
        "Вы можете подавать заявку на удаление только своих сделок",
        HttpStatus.FORBIDDEN,
      );
    }

    if (deal.deletedAt) {
      throw new HttpException("Сделка уже удалена", HttpStatus.BAD_REQUEST);
    }

    const hasPendingRequest =
      await this.dealDeletionRequestRepository.hasPendingRequestForDeal(dealId);
    if (hasPendingRequest) {
      throw new HttpException(
        "Уже существует активная заявка на удаление этой сделки",
        HttpStatus.BAD_REQUEST,
      );
    }

    const deletionRequest = await this.dealDeletionRequestRepository.save({
      deal_id: dealId,
      requester_id: auth_user.id,
      deletion_reason: createDeletionRequestDto.deletion_reason,
      status: DealDeletionStatus.PENDING,
    });

    await this.notifyAdminsAboutDeletionRequest(deletionRequest);

    return this.mapDeletionRequestToResponse(deletionRequest);
  }

  async getDeletionRequests(
    auth_user: UserEntity,
  ): Promise<DealDeletionRequestResponseDto[]> {
    let requests: DealDeletionRequestEntity[];

    if (this.isSuperAdmin(auth_user)) {
      requests =
        await this.dealDeletionRequestRepository.findAllWithRelations();
    } else {
      requests = await this.dealDeletionRequestRepository.findByRequesterId(
        auth_user.id,
      );
    }

    return requests.map((request) =>
      this.mapDeletionRequestToResponse(request),
    );
  }

  async getPendingDeletionRequests(
    auth_user: UserEntity,
  ): Promise<DealDeletionRequestResponseDto[]> {
    if (!this.isSuperAdmin(auth_user)) {
      throw new HttpException(
        "Недостаточно прав для просмотра ожидающих заявок",
        HttpStatus.FORBIDDEN,
      );
    }

    const requests =
      await this.dealDeletionRequestRepository.findPendingRequests();
    return requests.map((request) =>
      this.mapDeletionRequestToResponse(request),
    );
  }

  async processDeletionRequest(
    requestId: number,
    auth_user: UserEntity,
    processDto: ProcessDealDeletionRequestDto,
  ): Promise<{ message: string }> {
    if (!this.isSuperAdmin(auth_user)) {
      throw new HttpException(
        "Недостаточно прав для обработки заявок на удаление",
        HttpStatus.FORBIDDEN,
      );
    }

    const request =
      await this.dealDeletionRequestRepository.findById(requestId);
    if (!request) {
      throw new HttpException(
        "Заявка на удаление не найдена",
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.status !== DealDeletionStatus.PENDING) {
      throw new HttpException("Заявка уже обработана", HttpStatus.BAD_REQUEST);
    }

    await this.dealDeletionRequestRepository.update(requestId, {
      status: processDto.status,
      processed_by_id: auth_user.id,
      processed_at: new Date(),
    });

    if (processDto.status === DealDeletionStatus.APPROVED) {
      await this.dealRepository.softDelete(request.deal_id);
    }

    await this.notifyUserAboutDeletionRequestResult(
      request,
      processDto.status,
      auth_user,
    );

    const statusText =
      processDto.status === DealDeletionStatus.APPROVED
        ? "одобрена"
        : "отклонена";
    return { message: `Заявка на удаление ${statusText}` };
  }

  private async notifyAdminsAboutDeletionRequest(
    request: DealDeletionRequestEntity,
  ) {
    try {
      const qb = this.userRepository.createQueryBuilder("u");
      qb.leftJoin("user_roles", "ur", "u.id = ur.user_id")
        .leftJoin("roles", "r", "ur.role_id = r.id")
        .leftJoin("roles", "r2", "u.role_id = r2.id")
        .where("(r.id = 1 OR r2.id = 1)");

      const superAdmins = await qb.getMany();

      const requestWithRelations =
        await this.dealDeletionRequestRepository.findById(request.id);
      if (!requestWithRelations) {
        this.logger.error(
          `Не удалось найти заявку ${request.id} для отправки уведомления`,
        );
        return;
      }

      for (const admin of superAdmins) {
        await this.emailConfirmerService.emailSend({
          email: admin.email,
          subject: "Новая заявка на удаление сделки",
          template: "admin-deletion-request-notification",
          context: {
            adminName: admin?.user_info?.first_name || "Администратор",
            dealNumber:
              requestWithRelations.deal?.deal_num || `ID: ${request.deal_id}`,
            dealId: requestWithRelations.deal?.id || request.deal_id,
            requesterEmail:
              requestWithRelations.requester?.email || "Неизвестно",
            deletionReason: request.deletion_reason,
            requestDate: new Date().toLocaleDateString("ru-RU"),
            requestId: request.id,
            link: "https://partner-admin.trinity.ru/",
          },
        });
      }
    } catch (error) {
      console.error(
        "Ошибка отправки уведомления админам о заявке на удаление:",
        error,
      );
    }
  }

  private async notifyUserAboutDeletionRequestResult(
    request: DealDeletionRequestEntity,
    status: DealDeletionStatus,
    processedBy: UserEntity,
  ) {
    try {
      const requestWithRelations =
        await this.dealDeletionRequestRepository.findById(request.id);
      if (!requestWithRelations) {
        this.logger.error(
          `Не удалось найти заявку ${request.id} для отправки уведомления`,
        );
        return;
      }

      const statusText =
        status === DealDeletionStatus.APPROVED ? "одобрена" : "отклонена";

      await this.emailConfirmerService.emailSend({
        email: requestWithRelations.requester?.email || "",
        subject: `Заявка на удаление сделки ${statusText}`,
        template: "user-deletion-request-result",
        context: {
          link: this.hostname,
          userName:
            requestWithRelations.requester?.user_info?.first_name || "Пользователь",
          dealNumber:
            requestWithRelations.deal?.deal_num || `ID: ${request.deal_id}`,
          status: statusText,
          isApproved: status === DealDeletionStatus.APPROVED,
          processedByEmail: processedBy.email,
          processedDate: new Date().toLocaleDateString("ru-RU"),
        },
      });
    } catch (error) {
      console.error(
        "Ошибка отправки уведомления пользователю о результате заявки:",
        error,
      );
    }
  }

  private mapDeletionRequestToResponse(
    request: DealDeletionRequestEntity,
  ): DealDeletionRequestResponseDto {
    return {
      id: request.id,
      deal_id: request.deal_id,
      deal_num: request.deal?.deal_num || "",
      requester_id: request.requester_id,
      requester_email: request.requester?.email || "",
      deletion_reason: request.deletion_reason,
      status: request.status,
      processed_by_id: request.processed_by_id,
      processed_by_email: request.processed_by?.email,
      processed_at: request.processed_at,
      created_at: request.created_at,
      updated_at: request.updated_at,
    };
  }

  async updateDealStatus(
    dealId: number,
    status: DealStatus,
    auth_user: UserEntity,
  ): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);

    if (!(await this.canUpdateDealStatus(deal, auth_user))) {
      throw new HttpException(
        "У вас недостаточно прав для изменения этапа сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    const updatedDeal = await this.dealRepository.update(dealId, { status });

    if (deal.bitrix24_deal_id) {
      const distributor = await this.distributorRepository.findById(
        deal.distributor_id,
      );
      const distributorName = distributor?.name || distributor?.name;
      deal.status = status;

      this.bitrix24Service
        .updateLead(deal.bitrix24_deal_id, deal, distributorName)
        .catch((error) => {
          this.logger.error(
            `Ошибка обновления лида ${dealId} в Bitrix24:`,
            error,
          );
        });
    }

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось обновить этап сделки",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.notifyDealStatusChanged(deal, status, auth_user);

    return this.findOne(dealId, auth_user);
  }

  async update(
    dealId: number,
    auth_user: UserEntity,
    updateDealDto: UpdateDealDto,
  ) {
    const deal = await this.findOne(dealId, auth_user);

    if (!(await this.canUpdateDealFields(deal, auth_user))) {
      throw new HttpException(
        "У вас недостаточно прав для редактирования сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    const dealPatch: Record<string, unknown> = {};
    const customerPatch: Record<string, unknown> = {};
    const changedFieldLabels: string[] = [];

    if (updateDealDto.distributor_id !== undefined) {
      const distributor = await this.distributorRepository.findById(
        updateDealDto.distributor_id,
      );

      if (!distributor) {
        throw new HttpException(
          "Данного дистрибьютора не существует",
          HttpStatus.BAD_REQUEST,
        );
      }

      dealPatch.distributor_id = distributor.id;
      changedFieldLabels.push("дистрибьютор");
    }

    if (updateDealDto.integrator_company_id !== undefined) {
      const integratorCompany = await this.companyRepository.findById(
        updateDealDto.integrator_company_id,
      );

      if (
        !integratorCompany ||
        integratorCompany.partnership_type !== PartnershipType.Integrator
      ) {
        throw new HttpException(
          "Данного интегратора не существует",
          HttpStatus.BAD_REQUEST,
        );
      }

      dealPatch.integrator_company_id = integratorCompany.id;
      dealPatch.integrator_name = integratorCompany.name;
      dealPatch.integrator_inn = integratorCompany.inn;
      changedFieldLabels.push("интегратор");
    }

    if (updateDealDto.integrator_name !== undefined) {
      dealPatch.integrator_name = updateDealDto.integrator_name.trim();
      changedFieldLabels.push("интегратор");
    }

    if (updateDealDto.integrator_inn !== undefined) {
      const integratorInn = updateDealDto.integrator_inn.trim();
      dealPatch.integrator_inn = integratorInn;
      changedFieldLabels.push("ИНН интегратора");

      const registeredIntegrator = await this.companyRepository.findOne({
        where: {
          inn: integratorInn,
          partnership_type: PartnershipType.Integrator,
        },
      });

      if (registeredIntegrator) {
        dealPatch.integrator_company_id = registeredIntegrator.id;
        dealPatch.integrator_name = registeredIntegrator.name;
      }
    }

    if (updateDealDto.deal_sum !== undefined) {
      dealPatch.deal_sum = updateDealDto.deal_sum;
      changedFieldLabels.push("сумма сделки");
    }

    if (updateDealDto.competition_link !== undefined) {
      dealPatch.competition_link = updateDealDto.competition_link;
      changedFieldLabels.push("ссылка на процедуру");
    }

    if (updateDealDto.configuration_link !== undefined) {
      dealPatch.configuration_link = updateDealDto.configuration_link;
      changedFieldLabels.push("файл конфигурации");
    }

    if (updateDealDto.purchase_date !== undefined) {
      dealPatch.purchase_date = updateDealDto.purchase_date;
      dealPatch.purchase_overdue_notified_at = null;
      dealPatch.purchase_due_email_sent_at = null;
      dealPatch.purchase_reminder_7_days_sent_at = null;
      dealPatch.purchase_reminder_3_days_sent_at = null;
      dealPatch.purchase_reminder_1_day_sent_at = null;
      dealPatch.purchase_due_web_notified_at = null;
      changedFieldLabels.push("дата закупки");
    }

    if (updateDealDto.comment !== undefined) {
      dealPatch.comment = updateDealDto.comment;
      changedFieldLabels.push("комментарий");
    }

    if (updateDealDto.customer) {
      const { first_name, last_name, company_name, email, phone } =
        updateDealDto.customer;

      if (first_name !== undefined) {
        customerPatch.first_name = first_name;
        changedFieldLabels.push("имя заказчика");
      }
      if (last_name !== undefined) {
        customerPatch.last_name = last_name;
        changedFieldLabels.push("фамилия заказчика");
      }
      if (company_name !== undefined) {
        customerPatch.company_name = company_name;
        changedFieldLabels.push("компания заказчика");
      }
      if (email !== undefined) {
        customerPatch.email = email;
        changedFieldLabels.push("email заказчика");
      }
      if (phone !== undefined) {
        customerPatch.phone = phone;
        changedFieldLabels.push("телефон заказчика");
      }
    }

    const hasChanges =
      Object.keys(dealPatch).length || Object.keys(customerPatch).length;

    const nextDistributorId =
      (dealPatch.distributor_id as number | undefined) || deal.distributor_id;
    const nextIntegratorCompanyId =
      (dealPatch.integrator_company_id as number | undefined) ||
      deal.integrator_company_id;
    const nextIntegratorName =
      (dealPatch.integrator_name as string | undefined) || deal.integrator_name;
    const nextIntegratorInn =
      (dealPatch.integrator_inn as string | undefined) || deal.integrator_inn;

    if (
      !nextDistributorId ||
      (!nextIntegratorCompanyId && (!nextIntegratorName || !nextIntegratorInn))
    ) {
      throw new HttpException(
        "В сделке должны быть указаны дистрибьютор и интегратор",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dealPatch.integrator_inn || dealPatch.integrator_name) {
      dealPatch.bitrix24_integrator_contact_id =
        await this.bitrix24Service.findOrCreateIntegratorContact({
          name: nextIntegratorName || "",
          inn: nextIntegratorInn || "",
        });
    }

    if (Object.keys(customerPatch).length) {
      await this.customerRepository.update(deal.customer_id, customerPatch);
    }

    if (hasChanges) {
      dealPatch.status =
        deal.status === DealStatus.Moderation
          ? deal.status
          : DealStatus.Moderation;

      const updatedDeal = await this.dealRepository.update(dealId, dealPatch);

      if (updatedDeal.affected === 0) {
        throw new HttpException(
          "Не удалось обновить сделку",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (deal.bitrix24_deal_id) {
        const distributor = await this.distributorRepository.findById(
          (dealPatch.distributor_id as number | undefined) ||
            deal.distributor_id,
        );
        const nextDeal = Object.assign(deal, dealPatch);

        this.bitrix24Service
          .updateLead(
            deal.bitrix24_deal_id,
            nextDeal,
            distributor?.name || deal.distributor?.name,
          )
          .catch((error) => {
            this.logger.error(
              `Ошибка обновления лида ${dealId} в Bitrix24:`,
              error,
            );
          });
      }
    }

    if (hasChanges) {
      const changedFieldsText =
        changedFieldLabels.length > 0
          ? Array.from(new Set(changedFieldLabels)).join(", ")
          : "данные";
      await this.notifyDealChanged(
        deal,
        `В сделке №${deal.deal_num} изменены: ${changedFieldsText}`,
        `В сделке №${deal.deal_num} изменены: ${changedFieldsText}. Изменил: ${this.getActorName(auth_user)}.`,
        auth_user,
      );
    }

    return this.findOne(dealId, auth_user);
  }

  async addConfigurations(
    dealId: number,
    auth_user: UserEntity,
    addDealConfigurationsDto: AddDealConfigurationsDto,
  ) {
    const deal = await this.findOne(dealId, auth_user);
    this.assertCanUpdateDealConfigurations(deal, auth_user);

    const incomingConfigurations = addDealConfigurationsDto.configurations || [];

    if (!incomingConfigurations.length) {
      throw new HttpException(
        "Не переданы конфигурации для добавления",
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentConfigurations = Array.isArray(deal.configurations)
      ? deal.configurations
      : [];

    const updatedDeal = await this.dealRepository.update(dealId, {
      configurations: [
        ...currentConfigurations,
        ...incomingConfigurations,
      ] as unknown[],
      status:
        deal.status === DealStatus.Moderation
          ? deal.status
          : DealStatus.Moderation,
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось добавить конфигурацию в сделку",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.notifyDealChanged(
      deal,
      `В сделке №${deal.deal_num} добавлена конфигурация`,
      `В сделке №${deal.deal_num} добавлены конфигурации: ${incomingConfigurations.length}. Изменил: ${this.getActorName(auth_user)}.`,
      auth_user,
    );

    return this.findOne(dealId, auth_user);
  }

  async removeConfiguration(
    dealId: number,
    configurationId: string,
    auth_user: UserEntity,
  ) {
    const deal = await this.findOne(dealId, auth_user);
    this.assertCanUpdateDealConfigurations(deal, auth_user);

    const currentConfigurations = Array.isArray(deal.configurations)
      ? deal.configurations
      : [];
    const nextConfigurations = currentConfigurations.filter(
      (configuration: any) => configuration?.id !== configurationId,
    );

    if (nextConfigurations.length === currentConfigurations.length) {
      throw new HttpException(
        "Конфигурация сделки не найдена",
        HttpStatus.NOT_FOUND,
      );
    }

    const updatedDeal = await this.dealRepository.update(dealId, {
      configurations: nextConfigurations as unknown[],
      status:
        deal.status === DealStatus.Moderation
          ? deal.status
          : DealStatus.Moderation,
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось удалить конфигурацию из сделки",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.notifyDealChanged(
      deal,
      `В сделке №${deal.deal_num} удалена конфигурация`,
      `В сделке №${deal.deal_num} удалена конфигурация. Изменил: ${this.getActorName(auth_user)}.`,
      auth_user,
    );

    return this.findOne(dealId, auth_user);
  }

  async updateConfiguration(
    dealId: number,
    configurationId: string,
    auth_user: UserEntity,
    addDealConfigurationsDto: AddDealConfigurationsDto,
  ) {
    const deal = await this.findOne(dealId, auth_user);
    this.assertCanUpdateDealConfigurations(deal, auth_user);

    const nextConfiguration = addDealConfigurationsDto.configurations?.[0];
    if (!nextConfiguration) {
      throw new HttpException(
        "Не передана конфигурация для обновления",
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentConfigurations = Array.isArray(deal.configurations)
      ? deal.configurations
      : [];
    let isUpdated = false;
    const nextConfigurations = currentConfigurations.map((configuration: any) => {
      if (configuration?.id !== configurationId) return configuration;
      isUpdated = true;
      return {
        ...nextConfiguration,
        id: configurationId,
      };
    });

    if (!isUpdated) {
      throw new HttpException(
        "Конфигурация сделки не найдена",
        HttpStatus.NOT_FOUND,
      );
    }

    const updatedDeal = await this.dealRepository.update(dealId, {
      configurations: nextConfigurations as unknown[],
      status:
        deal.status === DealStatus.Moderation
          ? deal.status
          : DealStatus.Moderation,
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось обновить конфигурацию сделки",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.notifyDealChanged(
      deal,
      `В сделке №${deal.deal_num} изменена конфигурация`,
      `В сделке №${deal.deal_num} изменена конфигурация. Изменил: ${this.getActorName(auth_user)}.`,
      auth_user,
    );

    return this.findOne(dealId, auth_user);
  }

  async addAttachment(
    dealId: number,
    auth_user: UserEntity,
    addDealAttachmentDto: AddDealAttachmentDto,
  ) {
    const deal = await this.findOne(dealId, auth_user);

    if (!(await this.canUpdateDealFields(deal, auth_user))) {
      throw new HttpException(
        "У вас недостаточно прав для добавления документов в сделку",
        HttpStatus.FORBIDDEN,
      );
    }

    const currentAttachments = Array.isArray(deal.attachments)
      ? deal.attachments
      : [];
    const attachment = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: addDealAttachmentDto.name,
      url: addDealAttachmentDto.url,
      category: addDealAttachmentDto.category || "Прочие вложения",
      comment: addDealAttachmentDto.comment || "",
      uploaded_by_id: auth_user.id,
      uploaded_at: new Date().toISOString(),
    };

    const updatedDeal = await this.dealRepository.update(dealId, {
      attachments: [...currentAttachments, attachment],
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось добавить документ в сделку",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.notifyDealAttachmentAdded(deal, attachment, auth_user);

    return this.findOne(dealId, auth_user);
  }

  async addComment(
    dealId: number,
    auth_user: UserEntity,
    addDealCommentDto: AddDealCommentDto,
  ) {
    const deal = await this.findOne(dealId, auth_user);
    const text = addDealCommentDto.text.trim();

    if (!text) {
      throw new HttpException(
        "Комментарий не может быть пустым",
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentComments = Array.isArray(deal.comments)
      ? deal.comments
      : [];
    const comment = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      author_id: auth_user.id,
      author_name: this.getActorName(auth_user),
      created_at: new Date().toISOString(),
    };

    const updatedDeal = await this.dealRepository.update(dealId, {
      comments: [...currentComments, comment],
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось добавить комментарий к сделке",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.notifyDealChanged(
      deal,
      `В сделке №${deal.deal_num} добавлен комментарий`,
      `В сделке №${deal.deal_num} добавлен комментарий. Автор: ${this.getActorName(auth_user)}.`,
      auth_user,
    );

    return this.findOne(dealId, auth_user);
  }

  private async notifyDealStatusChanged(
    deal: any,
    status: DealStatus,
    actor: UserEntity,
  ) {
    const recipientIds = await this.getDealStatusNotificationRecipientIds(deal);
    const statusText = DealStatusRu[status] || status;
    const actorName = this.getActorName(actor);

    await Promise.all(
      recipientIds
        .filter((userId) => userId !== actor.id)
        .map((userId) =>
          this.notificationService.send({
            user_id: userId,
            title: `Сделка №${deal.deal_num} перешла в статус "${statusText}"`,
            text: `Сделка №${deal.deal_num} перешла в статус "${statusText}". Изменил: ${actorName}.`,
            category: NotificationCategory.Deal,
            actions: [
              {
                label: "Перейти к сделке",
                url: `/deals.management/${deal.id}`,
              },
            ],
          }),
        ),
    );
  }

  @Cron("0 9 * * *")
  async notifyPurchaseDateOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const trackedStatuses = [DealStatus.Moderation, DealStatus.Registered];
    const reminderSchedule = [
      {
        daysBefore: 7,
        marker: "purchase_reminder_7_days_sent_at",
      },
      {
        daysBefore: 3,
        marker: "purchase_reminder_3_days_sent_at",
      },
      {
        daysBefore: 1,
        marker: "purchase_reminder_1_day_sent_at",
      },
      {
        daysBefore: 0,
        marker: "purchase_due_web_notified_at",
      },
    ];

    for (const reminder of reminderSchedule) {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() + reminder.daysBefore);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const reminderDeals = await this.dealRepository
        .createQueryBuilder("deal")
        .where("deal.status IN (:...statuses)", { statuses: trackedStatuses })
        .andWhere("deal.purchase_date >= :startDate", { startDate })
        .andWhere("deal.purchase_date < :endDate", { endDate })
        .andWhere(`deal.${reminder.marker} IS NULL`)
        .getMany();

      for (const deal of reminderDeals) {
        await this.sendPurchaseDateReminderWebNotifications(
          deal,
          reminder.daysBefore,
        );

        await this.dealRepository.update(deal.id, {
          [reminder.marker]: new Date(),
        });
      }
    }

    const dueTodayDeals = await this.dealRepository
      .createQueryBuilder("deal")
      .where("deal.status IN (:...statuses)", { statuses: trackedStatuses })
      .andWhere("deal.purchase_date >= :today", { today })
      .andWhere("deal.purchase_date < :tomorrow", { tomorrow })
      .andWhere("deal.purchase_due_email_sent_at IS NULL")
      .getMany();

    for (const deal of dueTodayDeals) {
      await this.sendPurchaseDateOverdueEmails(deal);

      await this.dealRepository.update(deal.id, {
        purchase_due_email_sent_at: new Date(),
      });
    }

    const overdueDeals = await this.dealRepository
      .createQueryBuilder("deal")
      .where("deal.status IN (:...statuses)", { statuses: trackedStatuses })
      .andWhere("deal.purchase_date >= :threeDaysAgo", { threeDaysAgo })
      .andWhere("deal.purchase_date < :twoDaysAgo", { twoDaysAgo })
      .andWhere("deal.purchase_overdue_notified_at IS NULL")
      .getMany();

    for (const deal of overdueDeals) {
      await this.sendPurchaseDateOverdueWebNotifications(deal);

      await this.dealRepository.update(deal.id, {
        purchase_overdue_notified_at: new Date(),
      });
    }
  }

  private async sendPurchaseDateReminderWebNotifications(
    deal: any,
    daysBefore: number,
  ) {
    const recipientIds = await this.getDealStatusNotificationRecipientIds(deal);
    const purchaseDate = new Date(deal.purchase_date).toLocaleDateString(
      "ru-RU",
    );
    const text =
      daysBefore > 0
        ? `В сделке №${deal.deal_num} приближается дата закупки: ${purchaseDate}.`
        : `В сделке №${deal.deal_num} сегодня дата закупки: ${purchaseDate}.`;

    await Promise.all(
      recipientIds.map((userId) =>
        this.notificationService.send({
          user_id: userId,
          title: `В сделке №${deal.deal_num} приближается дата закупки`,
          text,
          category: NotificationCategory.Deal,
          actions: [
            {
              label: "Актуализировать",
              url: `/deals.management/${deal.id}`,
            },
          ],
        }),
      ),
    );
  }

  private async sendPurchaseDateOverdueWebNotifications(deal: any) {
    const recipientIds = await this.getDealStatusNotificationRecipientIds(deal);
    const purchaseDate = new Date(deal.purchase_date).toLocaleDateString(
      "ru-RU",
    );

    await Promise.all(
      recipientIds.map((userId) =>
        this.notificationService.send({
          user_id: userId,
          title: `В сделке №${deal.deal_num} дата закупки просрочена`,
          text: `В сделке №${deal.deal_num} дата закупки просрочена: ${purchaseDate}.`,
          category: NotificationCategory.Deal,
          actions: [
            {
              label: "Актуализировать",
              url: `/deals.management/${deal.id}`,
            },
          ],
        }),
      ),
    );
  }

  private async sendPurchaseDateOverdueEmails(deal: any) {
    const recipientIds = await this.getDealStatusNotificationRecipientIds(deal);
    const purchaseDate = new Date(deal.purchase_date).toLocaleDateString(
      "ru-RU",
    );
    const title = `Просрочена дата закупки в сделке №${deal.deal_num} на партнерском портала Тринити`;
    const dealUrl = this.getDealUrl(deal.id);
    const html = `
      <p>Здравствуйте!</p>
      <p>Дата закупки по сделке №${deal.deal_num} была ${purchaseDate}. Сделка до сих пор не закрыта.</p>
      <p>Для завершения сделки перейдите по ссылке: <a href="${dealUrl}">${dealUrl}</a></p>
      <p>С уважением,<br>Команда Тринити</p>
    `;

    await Promise.all(
      recipientIds.map(async (userId) => {
        const user = await this.userRepository.findById(userId);
        if (!user?.email) return;

        await this.notificationService.sendEmail({
          user_id: user.id,
          email: user.email,
          title,
          text: html,
          category: NotificationCategory.Deal,
        });
      }),
    );
  }

  private async notifyDealAttachmentAdded(
    deal: any,
    attachment: any,
    actor: UserEntity,
  ) {
    const recipientIds = await this.getDealStatusNotificationRecipientIds(deal);
    const actorName = this.getActorName(actor);

    await Promise.all(
      recipientIds
        .filter((userId) => userId !== actor.id)
        .map((userId) =>
          this.notificationService.send({
            user_id: userId,
            title: `В сделке №${deal.deal_num} добавлено вложение`,
            text: `В сделке №${deal.deal_num} добавлено вложение "${attachment.name}". Добавил: ${actorName}.`,
            category: NotificationCategory.Deal,
            actions: [
              {
                label: "Перейти к сделке",
                url: `/deals.management/${deal.id}`,
              },
            ],
          }),
        ),
    );
  }

  private async notifyDealChanged(
    deal: any,
    title: string,
    text: string,
    actor: UserEntity,
  ) {
    const recipientIds = await this.getDealStatusNotificationRecipientIds(deal);

    await Promise.all(
      recipientIds
        .filter((userId) => userId !== actor.id)
        .map((userId) =>
          this.notificationService.send({
            user_id: userId,
            title,
            text,
            category: NotificationCategory.Deal,
            actions: [
              {
                label: "Перейти к сделке",
                url: `/deals.management/${deal.id}`,
              },
            ],
          }),
        ),
    );
  }

  private getActorName(actor: UserEntity) {
    return actor.user_info?.first_name && actor.user_info?.last_name
      ? `${actor.user_info.first_name} ${actor.user_info.last_name}`
      : actor.email;
  }

  private async getDealStatusNotificationRecipientIds(deal: any) {
    const recipientIds = new Set<number>();
    const creator = await this.userRepository.findByIdWithUserInfo(
      deal.creator_id,
    );

    if (creator?.id) {
      recipientIds.add(creator.id);
    }

    if (creator?.manager_id) {
      recipientIds.add(creator.manager_id);
    }

    const trinityAdminIds = await this.findTrinityDealAdminIds();
    trinityAdminIds.forEach((userId) => recipientIds.add(userId));

    const distributorCompany = await this.findDistributorCompanyForDeal(deal);
    if (distributorCompany) {
      const companyAdminIds = await this.getCompanyAdminUserIds(distributorCompany.id);
      companyAdminIds.forEach((userId) => recipientIds.add(userId));
    }

    const integratorCompany = deal.integrator_company_id
      ? await this.companyRepository.findById(deal.integrator_company_id)
      : deal.integrator_inn
        ? await this.companyRepository.findOne({
            where: {
              inn: deal.integrator_inn,
              partnership_type: PartnershipType.Integrator,
            },
          })
        : null;

    if (integratorCompany) {
      const companyAdminIds = await this.getCompanyAdminUserIds(integratorCompany.id);
      companyAdminIds.forEach((userId) => recipientIds.add(userId));
    }

    return Array.from(recipientIds);
  }

  private async findTrinityDealAdminIds() {
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

    return admins.map((admin) => admin.id);
  }

  private async canUpdateDealStatus(deal: any, auth_user: UserEntity) {
    if (
      this.hasAnyRole(auth_user, [
        RoleTypes.SuperAdmin,
        RoleTypes.PartnerManager,
      ])
    ) {
      return true;
    }

    const creator = await this.userRepository.findOne({
      where: { id: deal.creator_id },
      relations: ["manager"],
    });

    if (creator?.manager_id === auth_user.id) {
      return true;
    }

    return false;
  }

  private canUpdateDealConfigurations(deal: any, auth_user: UserEntity) {
    return (
      deal.creator_id === auth_user.id &&
      ![DealStatus.Win, DealStatus.Lose].includes(deal.status)
    );
  }

  private assertCanUpdateDealConfigurations(deal: any, auth_user: UserEntity) {
    if (deal.creator_id !== auth_user.id) {
      throw new HttpException(
        "Редактировать конфигурации сделки может только создатель",
        HttpStatus.FORBIDDEN,
      );
    }

    if ([DealStatus.Win, DealStatus.Lose].includes(deal.status)) {
      throw new HttpException(
        "Нельзя редактировать конфигурации завершенной сделки",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async canUpdateDealFields(deal: any, auth_user: UserEntity) {
    if (deal.creator_id === auth_user.id) {
      return true;
    }

    return this.canUpdateDealStatus(deal, auth_user);
  }

  private isCompanyDealAdmin(user: UserEntity) {
    return this.hasAnyRole(user, [
      RoleTypes.CompanyAdmin,
      RoleTypes.Partner,
      RoleTypes.EmployeeAdmin,
    ]);
  }

  private isDealVisibleForCompany(deal: any, company?: CompanyEntity | null) {
    if (!company) return false;

    if (
      company.partnership_type === PartnershipType.Integrator &&
      (deal.integrator_company_id === company.id ||
        (deal.integrator_inn && deal.integrator_inn === company.inn))
    ) {
      return true;
    }

    if (company.partnership_type === PartnershipType.Distributor) {
      return deal.distributor?.name === company.name;
    }

    return false;
  }

  private async findDistributorCompanyForDeal(deal: any) {
    const distributorName = deal.distributor?.name;
    if (!distributorName) return null;

    return this.companyRepository.findOne({
      where: {
        name: distributorName,
        partnership_type: PartnershipType.Distributor,
      },
    });
  }

  private async getCompanyAdminUserIds(companyId: number) {
    const company = await this.companyRepository.findById(companyId);
    const userIds = new Set<number>();

    if (company?.owner_id) {
      userIds.add(company.owner_id);
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
      .forEach((employee) => userIds.add(employee.employee_id));

    return Array.from(userIds);
  }

  async convertLeadToDeal(dealId: number, auth_user: UserEntity): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);

    if (!deal.bitrix24_deal_id) {
      throw new HttpException("Лид не найден в Bitrix24", HttpStatus.NOT_FOUND);
    }

    try {
      const result = await this.bitrix24Service.convertLead(
        deal.bitrix24_deal_id,
      );

      if (result?.dealId) {
        this.logger.log(
          `Лид ${deal.bitrix24_deal_id} конвертирован в сделку ${result.dealId}`,
        );

        return {
          success: true,
          leadId: deal.bitrix24_deal_id,
          dealId: result.dealId,
          contactId: result.contactId,
        };
      }

      throw new HttpException(
        "Не удалось конвертировать лид",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } catch (error) {
      this.logger.error(`Ошибка конвертации лида ${dealId}:`, error);
      throw new HttpException(
        "Ошибка конвертации лида",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async forceSendToBitrix24(
    dealId: number,
    auth_user: UserEntity,
  ): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);
    const customer = await this.customerRepository.findById(deal.customer_id);
    const distributor = await this.distributorRepository.findById(
      deal.distributor_id,
    );

    const creator = await this.userRepository.findByIdWithUserInfo(
      deal.creator_id,
    );

    if (!customer) {
      throw new HttpException("Клиент не найден", HttpStatus.NOT_FOUND);
    }

    if (!creator) {
      throw new HttpException(
        "Создатель сделки не найден",
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      await this.dealRepository.update(dealId, {
        bitrix24_sync_status: Bitrix24SyncStatus.PENDING,
      });

      await this.sendLeadToBitrix24(deal, customer, distributor, creator);

      return { success: true, message: "Лид отправлен в Bitrix24" };
    } catch (error) {
      this.logger.error(
        `Ошибка принудительной отправки лида ${dealId}:`,
        error,
      );
      throw new HttpException(
        "Ошибка отправки лида",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async checkBitrix24Connection(): Promise<boolean> {
    return this.bitrix24Service.checkConnection();
  }

  async getBitrix24SyncStatus(
    dealId: number,
    auth_user: UserEntity,
  ): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);

    return {
      dealId: deal.id,
      bitrix24Id: deal.bitrix24_deal_id,
      syncStatus: deal.bitrix24_sync_status,
      syncedAt: deal.bitrix24_synced_at,
      isLead: true,
    };
  }

  async remove(id: number, auth_user: UserEntity): Promise<void> {
    if (!this.isSuperAdmin(auth_user)) {
      throw new HttpException(
        "У вас недостаточно прав для удаления сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    const deal = await this.dealRepository.findById(id);

    if (!deal) {
      throw new HttpException("Сделка не найдена", HttpStatus.NOT_FOUND);
    }

    await this.dealRepository.softDelete(id);
  }
}
