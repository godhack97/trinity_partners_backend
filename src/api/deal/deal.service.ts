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
  CompanyStatus,
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
import {
  InvalidRussianInnError,
  normalizeRussianInn,
} from "@app/utils/russian-inn";
import { NotificationService } from "@api/notification/notification.service";
import { AddDealConfigurationsDto } from "./dto/request/add-deal-configurations.dto";
import { UpdateDealDto } from "./dto/request/update-deal.dto";
import { AddDealAttachmentDto } from "./dto/request/add-deal-attachment.dto";
import { AddDealCommentDto } from "./dto/request/add-deal-comment.dto";

type DealAccessScope =
  | { kind: "global" }
  | { kind: "none" }
  | { kind: "self"; userId: number }
  | { kind: "partner_manager"; manager: UserEntity }
  | {
      kind: "company";
      company: CompanyEntity;
      visibleCreatorIds: Set<number>;
      canViewAllCompanyCreatedDeals: boolean;
      actorUserId: number;
    };

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

  async getCount(auth_user: UserEntity): Promise<number> {
    return this.getVisibleDealCount(auth_user);
  }

  async getCountByStatus(
    status: DealStatus,
    auth_user: UserEntity,
  ): Promise<number> {
    return this.getVisibleDealCount(auth_user, status);
  }

  async getAllCount(auth_user: UserEntity): Promise<number> {
    return this.getVisibleDealCount(auth_user);
  }

  async getModerationCount(auth_user: UserEntity): Promise<number> {
    return this.getVisibleDealCount(auth_user, DealStatus.Moderation);
  }

  async getRegisteredCount(auth_user: UserEntity): Promise<number> {
    return this.getVisibleDealCount(auth_user, DealStatus.Registered);
  }

  async getCanceledCount(auth_user: UserEntity): Promise<number> {
    return this.getVisibleDealCount(auth_user, DealStatus.Canceled);
  }

  async getWinCount(auth_user: UserEntity): Promise<number> {
    return this.getVisibleDealCount(auth_user, DealStatus.Win);
  }

  async getLooseCount(auth_user: UserEntity): Promise<number> {
    return this.getVisibleDealCount(auth_user, DealStatus.Lose);
  }

  async getRequestDeletedCount(): Promise<number> {
    return await this.dealDeletionRequestRepository.count({
      where: { status: DealDeletionStatus.PENDING },
    });
  }

  async create(auth_user: UserEntity, createDealDto: CreateDealDto) {
    const authUserCompany = await this.getUserCompany(auth_user);
    const canAssignParticipants = this.hasAnyRole(auth_user, [
      RoleTypes.SuperAdmin,
      RoleTypes.PartnerManager,
    ]);
    if (!canAssignParticipants) {
      this.assertAcceptedDealCreatorCompany(authUserCompany);
    }
    let distributorCompany: CompanyEntity | null = null;
    let distributor = null;

    if (
      !canAssignParticipants &&
      authUserCompany?.partnership_type === PartnershipType.Distributor
    ) {
      this.assertAcceptedDistributorCompany(authUserCompany);
      distributorCompany = authUserCompany;
      distributor = await this.findDistributorForCompany(authUserCompany);
    } else if (createDealDto.distributor_company_id) {
      distributorCompany = await this.getAcceptedDistributorCompany(
        createDealDto.distributor_company_id,
      );
      distributor = await this.findDistributorForCompany(distributorCompany);

      if (createDealDto.distributor_id) {
        const requestedLegacyDistributor =
          await this.distributorRepository.findById(
            createDealDto.distributor_id,
          );
        if (
          !requestedLegacyDistributor ||
          !this.haveSameCompanyName(
            requestedLegacyDistributor.name,
            distributorCompany.name,
          )
        ) {
          throw new HttpException(
            "Выбранные компания и запись дистрибьютора не совпадают",
            HttpStatus.BAD_REQUEST,
          );
        }
        distributor = requestedLegacyDistributor;
      }
    } else if (createDealDto.distributor_id) {
      distributor = await this.distributorRepository.findById(
        createDealDto.distributor_id,
      );
      distributorCompany = distributor
        ? await this.findAcceptedDistributorCompanyByName(distributor.name)
        : null;
    }

    let integratorCompany: CompanyEntity | null = null;
    const requestedIntegratorInn = `${createDealDto.integrator_inn || ""}`.trim();

    if (
      !canAssignParticipants &&
      authUserCompany?.partnership_type === PartnershipType.Integrator
    ) {
      this.assertAcceptedIntegratorCompany(authUserCompany);
      integratorCompany = authUserCompany;
    } else if (createDealDto.integrator_company_id) {
      integratorCompany = await this.getAcceptedIntegratorCompany(
        createDealDto.integrator_company_id,
      );
    } else if (requestedIntegratorInn) {
      integratorCompany = await this.findAcceptedIntegratorCompanyByInn(
        requestedIntegratorInn,
      );
    }

    if (!distributorCompany) {
      throw new HttpException(
        "Укажите действующую компанию-дистрибьютора",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!integratorCompany) {
      throw new HttpException(
        "Укажите действующую компанию-интегратора",
        HttpStatus.BAD_REQUEST,
      );
    }

    this.assertRequestedIntegratorIdentityMatchesCompany(
      integratorCompany,
      createDealDto.integrator_name,
      createDealDto.integrator_inn,
    );

    // Resolve and validate ownership before persisting the per-deal customer
    // snapshot. Legacy accepted companies without an active manager must be
    // remediated explicitly instead of creating unowned vendor queues.
    const responsibleManagerId =
      await this.resolveResponsibleManagerSnapshot(
        auth_user,
        authUserCompany,
      );

    const customerInnNormalized = this.normalizeCustomerInn(
      createDealDto.customer.inn,
    );
    // Customer details are a per-deal snapshot. Reusing a row by INN would let
    // one deal creator overwrite another partner's customer contact data.
    const customer = await this.customerRepository.save({
      first_name: createDealDto.customer.first_name,
      last_name: createDealDto.customer.last_name,
      company_name: createDealDto.customer.company_name,
      email: createDealDto.customer.email,
      phone: createDealDto.customer.phone,
      inn: customerInnNormalized,
      inn_normalized: customerInnNormalized,
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

    const dealType = this.isTrinityStaffDealCreator(auth_user)
      ? DealType.TrinityStaff
      : DealType.Partner;
    const dealData = {
      title: createDealDto.title,
      deal_sum: createDealDto.deal_sum,
      competition_link: createDealDto.competition_link,
      configuration_link: createDealDto.configuration_link,
      configurations: createDealDto.configurations,
      purchase_date: createDealDto.purchase_date,
      comment: createDealDto.comment,
      attachments: createDealDto.attachments,
      customer_id: customer.id,
      creator_id: auth_user.id,
      creator_company_id:
        dealType === DealType.Partner ? authUserCompany?.id || null : null,
      deal_num,
      distributor_id: distributor?.id || null,
      distributor_company_id: distributorCompany?.id || null,
      integrator_company_id: integratorCompany?.id || null,
      integrator_name: integratorCompany.name,
      integrator_inn: integratorCompany.inn,
      status: DealStatus.Draft,
      deal_type: dealType,
      responsible_manager_id: responsibleManagerId,
      duplicate_of_deal_id: null,
      duplicate_review_status: null,
    };

    const savedDeal = await this.dealRepository.save(dealData);
    await this.linkConfiguratorDraftsToDeal(
      createDealDto.configurations,
      savedDeal.id,
      auth_user.id,
    );

    return savedDeal;
  }

  async submit(dealId: number, auth_user: UserEntity) {
    const deal = await this.findOne(dealId, auth_user);

    if (deal.creator_id !== auth_user.id) {
      throw new HttpException(
        "Отправить сделку может только её создатель",
        HttpStatus.FORBIDDEN,
      );
    }

    if (deal.status !== DealStatus.Draft) {
      throw new HttpException(
        "Отправить можно только черновик сделки",
        HttpStatus.BAD_REQUEST,
      );
    }

    const customer =
      deal.customer || (await this.customerRepository.findById(deal.customer_id));
    const distributorCompany =
      deal.distributor_company ||
      (deal.distributor_company_id
        ? await this.companyRepository.findById(deal.distributor_company_id)
        : null);
    const integratorCompany =
      deal.integrator_company ||
      (deal.integrator_company_id
        ? await this.companyRepository.findById(deal.integrator_company_id)
        : null);

    if (!customer || !distributorCompany || !integratorCompany) {
      throw new HttpException(
        "Перед отправкой сопоставьте обе стороны сделки с действующими компаниями портала",
        HttpStatus.BAD_REQUEST,
      );
    }
    this.assertAcceptedDistributorCompany(distributorCompany);
    this.assertAcceptedIntegratorCompany(integratorCompany);

    const distributorParty = distributorCompany;
    const integratorName = integratorCompany.name;
    const integratorInn = integratorCompany.inn;

    const normalizedCustomerInn =
      customer.inn_normalized ||
      this.normalizeCustomerInn(customer.inn);

    const submitPatch = {
      status: DealStatus.Moderation,
      integrator_company_id: integratorCompany?.id || null,
      integrator_name: integratorName,
      integrator_inn: integratorInn,
      bitrix24_sync_status: Bitrix24SyncStatus.PENDING,
    };
    const duplicateClaim = await this.dealRepository.claimCustomerInnOnSubmit(
      dealId,
      normalizedCustomerInn,
      submitPatch,
      {
        distributorId: deal.distributor_id,
        distributorCompanyId: deal.distributor_company_id,
        integratorCompanyId: deal.integrator_company_id,
        integratorName: deal.integrator_name,
        integratorInn: deal.integrator_inn,
      },
    );
    if (!duplicateClaim) {
      throw new HttpException(
        "Сделка уже была отправлена или изменена",
        HttpStatus.CONFLICT,
      );
    }
    const duplicateInnDeal =
      duplicateClaim.canonicalDealId &&
      duplicateClaim.canonicalDealId !== dealId
        ? await this.dealRepository.findById(duplicateClaim.canonicalDealId)
        : null;
    const duplicatePatch = duplicateInnDeal
      ? {
          duplicate_of_deal_id: duplicateInnDeal.id,
          duplicate_review_status: DealDuplicateReviewStatus.Pending,
        }
      : {
          duplicate_of_deal_id: null,
          duplicate_review_status: null,
        };

    Object.assign(deal, submitPatch, duplicatePatch);
    const authUserCompany = await this.getDealCreatorCompany(deal);

    this.sendLeadToBitrix24(deal, customer, distributorParty, auth_user).catch(
      (error) => {
        this.logger.error(
          `Ошибка отправки лида для сделки ${deal.id} в Bitrix24:`,
          error,
        );
      },
    );

    await this.notifyAdminsAboutNewDeal(
      deal,
      customer,
      distributorParty,
      auth_user,
    );
    await this.notifyCounterpartyAdminsAboutNewDeal(
      deal,
      authUserCompany,
      distributorParty,
      integratorCompany,
      integratorName,
      integratorInn,
    );
    await this.notifyManagerAboutDuplicateCustomerInn(
      deal,
      duplicateInnDeal,
    );

    return this.findOne(dealId, auth_user);
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
      RoleTypes.PartnerManager,
      RoleTypes.ContentManager,
    ]);
  }

  private normalizeCustomerInn(value: unknown) {
    try {
      return normalizeRussianInn(value);
    } catch (error) {
      if (error instanceof InvalidRussianInnError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  private async notifyManagerAboutDuplicateCustomerInn(
    newDeal: any,
    similarDeal: any,
  ) {
    if (!similarDeal || similarDeal.id === newDeal.id) return;

    try {
      const recipientIds = await this.getDuplicateReviewRecipientIds(newDeal);
      const results = await Promise.allSettled(
        recipientIds.map((managerId) =>
          this.notificationService.send({
            user_id: managerId,
            title: "Найдена сделка с совпадающим ИНН заказчика",
            text: `Найдено похожее обращение в сделке ${similarDeal.id} (${similarDeal.deal_num}). Проверьте сделку ${newDeal.deal_num}, чтобы определить статус дубля.`,
            category: NotificationCategory.Deal,
            delivery_key: `deal-duplicate:${newDeal.id}:${managerId}:detected`,
            webOnly: true,
            actions: [
              {
                label: "Подробнее",
                url: `/deals/${newDeal.id}?duplicateOf=${similarDeal.id}`,
              },
            ],
          }),
        ),
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          this.logger.error(
            `Не удалось отправить уведомление о дубле сделки ${newDeal.id} пользователю ${recipientIds[index]}`,
            result.reason,
          );
        }
      });
    } catch (error) {
      // The durable pending review is authoritative; notification delivery is
      // best effort and must not turn an already submitted deal into an API 500.
      this.logger.error(
        `Не удалось определить получателей уведомления о дубле сделки ${newDeal.id}`,
        error,
      );
    }
  }

  private async getDuplicateReviewRecipientIds(deal: any) {
    if (deal.responsible_manager_id) {
      const manager = await this.userRepository.findByIdWithPermissions(
        deal.responsible_manager_id,
      );
      if (
        manager?.is_activated &&
        this.hasAnyRole(manager, [
          RoleTypes.SuperAdmin,
          RoleTypes.PartnerManager,
        ])
      ) {
        return [manager.id];
      }
    }

    return this.findTrinityDealAdminIds([RoleTypes.SuperAdmin]);
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
      if (
        ![DealStatus.Registered, DealStatus.Win, DealStatus.Lose].includes(
          deal.status,
        )
      ) {
        return;
      }

      const distributorCompany = await this.findCanonicalDistributorCompany(
        deal,
      );
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
    const managerId = deal.responsible_manager_id;
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
    force = false,
  ): Promise<boolean> {
    let claim: Awaited<ReturnType<DealRepository["claimBitrix24Sync"]>>;
    try {
      this.logger.log(`Отправка лида для сделки ${deal.id} в Bitrix24...`);

      claim = await this.dealRepository.claimBitrix24Sync(deal.id, force);
      if (!claim) {
        this.logger.warn(
          `Сделка ${deal.id} уже синхронизируется другим процессом`,
        );
        return false;
      }
      const claimedDeal = claim.deal;

      const distributorName =
        distributor?.name ||
        distributor?.company_name ||
        claimedDeal.distributor_company?.name ||
        claimedDeal.distributor?.name ||
        (claimedDeal.distributor_company_id
          ? `DistributorCompany_${claimedDeal.distributor_company_id}`
          : `Distributor_${claimedDeal.distributor_id}`);

      let dealCreator = creator || claimedDeal.partner;
      if (!dealCreator && claimedDeal.creator_id) {
        dealCreator = await this.userRepository.findByIdWithUserInfo(
          claimedDeal.creator_id,
        );
      }

      if (!dealCreator) {
        this.logger.error(`Не удалось найти создателя сделки ${deal.id}`);
        await this.dealRepository.finishBitrix24Sync(claim, {
          success: false,
        });
        return false;
      }

      let creatorContactId = dealCreator.bitrix24_contact_id;
      if (!creatorContactId) {
        creatorContactId = await this.bitrix24Service.createContact(
          dealCreator,
        );
        if (!creatorContactId) {
          await this.dealRepository.finishBitrix24Sync(claim, {
            success: false,
          });
          return false;
        }

        const persistedContact = await this.userRepository.update(
          dealCreator.id,
          { bitrix24_contact_id: creatorContactId },
        );
        if (!persistedContact.affected) {
          this.logger.error(
            `Не удалось сохранить контакт Bitrix24 пользователя ${dealCreator.id}`,
          );
          await this.dealRepository.finishBitrix24Sync(claim, {
            success: false,
          });
          return false;
        }
        dealCreator.bitrix24_contact_id = creatorContactId;
      }

      const dealWithPartner = Object.assign(claimedDeal, {
        partner: dealCreator,
        customer: claimedDeal.customer || customer,
      });

      let leadId: number | null;
      if (claimedDeal.bitrix24_deal_id) {
        const updated = await this.bitrix24Service.updateLead(
          claimedDeal.bitrix24_deal_id,
          dealWithPartner,
          distributorName,
          creatorContactId,
        );
        leadId = updated ? claimedDeal.bitrix24_deal_id : null;
      } else {
        leadId = await this.bitrix24Service.createLead(
          dealWithPartner,
          claimedDeal.customer || customer,
          distributorName,
          creatorContactId,
        );
      }

      if (leadId) {
        const persisted = await this.dealRepository.finishBitrix24Sync(claim, {
          success: true,
          bitrix24LeadId: leadId,
        });
        if (persisted) {
          this.logger.log(
            `Лид для сделки ${deal.id} синхронизирован в Bitrix24 с ID: ${leadId}`,
          );
        } else {
          this.logger.warn(
            `Результат синхронизации сделки ${deal.id} отклонен: аренда истекла`,
          );
        }
        return persisted;
      } else {
        await this.dealRepository.finishBitrix24Sync(claim, {
          success: false,
        });
        this.logger.warn(
          `Не удалось создать лид для сделки ${deal.id} в Bitrix24`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Ошибка при отправке лида для сделки ${deal.id} в Bitrix24:`,
        error,
      );

      if (claim) {
        await this.dealRepository.finishBitrix24Sync(claim, {
          success: false,
        });
      }
      return false;
    }
  }

  async findAll(auth_user: UserEntity, entry?: SearchDealDto) {
    return this.findVisibleDeals(auth_user, entry);
  }

  private async getVisibleDealCount(
    auth_user: UserEntity,
    status?: DealStatus,
  ) {
    const deals = await this.findVisibleDeals(
      auth_user,
      status ? ({ status } as SearchDealDto) : undefined,
    );
    return deals.length;
  }

  private async findVisibleDeals(
    auth_user: UserEntity,
    entry?: SearchDealDto,
  ) {
    if (
      entry?.duplicateReviewStatus &&
      !this.hasAnyRole(auth_user, [
        RoleTypes.SuperAdmin,
        RoleTypes.PartnerManager,
      ])
    ) {
      throw new HttpException(
        "Фильтр ручной проверки доступен только сотрудникам Тринити",
        HttpStatus.FORBIDDEN,
      );
    }

    const scope = await this.buildDealAccessScope(auth_user);
    await this.assertRequestedCompanyWithinScope(scope, entry?.companyId);

    if (scope.kind === "none") return [];

    const repositoryEntry =
      scope.kind === "company"
        ? { ...entry, companyId: scope.company.id }
        : entry;
    const creatorIds = scope.kind === "self" ? [scope.userId] : undefined;
    const deals = creatorIds
      ? await this.dealRepository.findDealsWithFilters(
          repositoryEntry,
          creatorIds,
        )
      : scope.kind === "company"
        ? await this.dealRepository.findDealsWithFilters(
            repositoryEntry,
            undefined,
            auth_user.id,
          )
        : await this.dealRepository.findDealsWithFilters(repositoryEntry);

    let visibleDeals = deals;
    if (scope.kind !== "global") {
      const visibility = await Promise.all(
        deals.map(async (deal) => ({
          deal,
          visible: await this.isDealVisibleWithinScope(deal, scope),
        })),
      );
      visibleDeals = visibility
        .filter(({ visible }) => visible)
        .map(({ deal }) => deal);
    }

    return Promise.all(
      visibleDeals.map((deal) => this.withDealCapabilities(deal, auth_user)),
    );
  }

  private async buildDealAccessScope(
    auth_user: UserEntity,
  ): Promise<DealAccessScope> {
    if (this.isSuperAdmin(auth_user)) {
      return { kind: "global" };
    }

    if (this.hasAnyRole(auth_user, [RoleTypes.PartnerManager])) {
      return { kind: "partner_manager", manager: auth_user };
    }

    if (this.hasAnyRole(auth_user, [RoleTypes.TechnicalSpecialist])) {
      return { kind: "global" };
    }

    if (this.hasAnyRole(auth_user, [RoleTypes.Staff])) {
      return { kind: "none" };
    }

    if (
      this.hasAnyRole(auth_user, [
        RoleTypes.EmployeeAdmin,
        RoleTypes.Partner,
        RoleTypes.CompanyAdmin,
        RoleTypes.SalesManager,
      ])
    ) {
      const company = await this.getUserCompany(auth_user);
      if (company) {
        return {
          kind: "company",
          company,
          visibleCreatorIds: await this.getVisibleCompanyCreatorIds(
            auth_user,
            company,
          ),
          canViewAllCompanyCreatedDeals: !this.hasAnyRole(auth_user, [
            RoleTypes.SalesManager,
          ]),
          actorUserId: auth_user.id,
        };
      }

      return { kind: "self", userId: auth_user.id };
    }

    if (this.hasAnyRole(auth_user, [RoleTypes.Employee])) {
      return { kind: "self", userId: auth_user.id };
    }

    return { kind: "none" };
  }

  private async assertRequestedCompanyWithinScope(
    scope: DealAccessScope,
    requestedCompanyId?: number,
  ) {
    if (!requestedCompanyId || scope.kind !== "partner_manager") return;

    const company = await this.companyRepository.findOneBy({
      id: requestedCompanyId,
    });
    if (
      !company ||
      company.responsible_manager_id !== scope.manager.id
    ) {
      throw new HttpException(
        "Нет доступа к сделкам этой компании",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async isDealVisibleWithinScope(
    deal: any,
    scope: DealAccessScope,
  ) {
    switch (scope.kind) {
      case "global":
        return true;
      case "none":
        return false;
      case "self":
        return deal.creator_id === scope.userId;
      case "partner_manager":
        return this.isDealManagedByPartnerManager(deal, scope.manager);
      case "company":
        if (deal.creator_id === scope.actorUserId) return true;
        return this.isDealVisibleForCompany(
          deal,
          scope.company,
          scope.visibleCreatorIds,
          scope.canViewAllCompanyCreatedDeals,
        );
    }
  }

  private async getUserCompany(
    auth_user: UserEntity,
  ): Promise<CompanyEntity | null> {
    return this.companyRepository.findUniqueAcceptedByUserId(auth_user.id);
  }

  private async resolveResponsibleManagerSnapshot(
    creator: UserEntity,
    creatorCompany?: CompanyEntity | null,
  ): Promise<number | null> {
    if (
      this.hasAnyRole(creator, [
        RoleTypes.SuperAdmin,
        RoleTypes.PartnerManager,
      ])
    ) {
      return creator.id;
    }

    const managerId = creatorCompany?.responsible_manager_id;
    if (!managerId) {
      throw new HttpException(
        "У компании не назначен ответственный менеджер Тринити",
        HttpStatus.CONFLICT,
      );
    }

    const manager = await this.userRepository.findByIdWithPermissions(
      managerId,
    );
    if (
      !manager?.is_activated ||
      !this.hasRole(manager, RoleTypes.PartnerManager)
    ) {
      throw new HttpException(
        "Ответственный менеджер компании неактивен или не имеет нужной роли",
        HttpStatus.CONFLICT,
      );
    }

    return managerId;
  }

  private async getDealCreatorCompany(deal: any) {
    if (deal.creator_company) return deal.creator_company;
    if (deal.creator_company_id) {
      return this.companyRepository.findById(deal.creator_company_id);
    }
    return null;
  }

  private async isDealManagedByPartnerManager(
    deal: any,
    manager: UserEntity,
  ) {
    if (deal.creator_id === manager.id) return true;
    return deal.responsible_manager_id === manager.id;
  }

  private async findDistributorForCompany(company: CompanyEntity) {
    return await this.distributorRepository.findByName(company.name);
  }

  private assertAcceptedDistributorCompany(company: CompanyEntity) {
    if (
      company.partnership_type !== PartnershipType.Distributor ||
      company.status !== CompanyStatus.Accept
    ) {
      throw new HttpException(
        "Компания-дистрибьютор должна быть действующим партнёром",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertAcceptedDealCreatorCompany(
    company?: CompanyEntity | null,
  ): asserts company is CompanyEntity {
    if (
      !company ||
      company.status !== CompanyStatus.Accept ||
      ![
        PartnershipType.Distributor,
        PartnershipType.Integrator,
      ].includes(company.partnership_type)
    ) {
      throw new HttpException(
        "Создавать сделки можно только от действующей компании-партнёра",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async getAcceptedDistributorCompany(companyId: number) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new HttpException(
        "Компания-дистрибьютор не найдена",
        HttpStatus.BAD_REQUEST,
      );
    }

    this.assertAcceptedDistributorCompany(company);
    return company;
  }

  private async findAcceptedDistributorCompanyByName(name?: string) {
    const normalizedName = `${name || ""}`.trim();
    if (!normalizedName) return null;

    return this.companyRepository.findAcceptedDistributorByName(
      normalizedName,
    );
  }

  private assertAcceptedIntegratorCompany(company: CompanyEntity) {
    if (
      company.partnership_type !== PartnershipType.Integrator ||
      company.status !== CompanyStatus.Accept
    ) {
      throw new HttpException(
        "Компания-интегратор должна быть действующим партнёром",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getAcceptedIntegratorCompany(companyId: number) {
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new HttpException(
        "Компания-интегратор не найдена",
        HttpStatus.BAD_REQUEST,
      );
    }

    this.assertAcceptedIntegratorCompany(company);
    return company;
  }

  private async findAcceptedIntegratorCompanyByInn(inn?: string) {
    const normalizedInn = `${inn || ""}`.trim();
    if (!normalizedInn) return null;

    return this.companyRepository.findAcceptedIntegratorByInn(normalizedInn);
  }

  private assertRequestedIntegratorIdentityMatchesCompany(
    company: CompanyEntity,
    requestedName?: string,
    requestedInn?: string,
  ) {
    const hasMismatchedName =
      requestedName !== undefined &&
      !this.haveSameCompanyName(requestedName, company.name);
    const hasMismatchedInn =
      requestedInn !== undefined &&
      `${requestedInn}`.trim() !== `${company.inn || ""}`.trim();

    if (hasMismatchedName || hasMismatchedInn) {
      throw new HttpException(
        "Реквизиты интегратора не совпадают с выбранной компанией",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private haveSameCompanyName(first?: string, second?: string) {
    return (
      `${first || ""}`.trim().toLocaleLowerCase("ru-RU") ===
      `${second || ""}`.trim().toLocaleLowerCase("ru-RU")
    );
  }

  private async getCompanyDealCreatorIds(company: CompanyEntity) {
    const ids = new Set<number>();
    if (company.owner_id) ids.add(company.owner_id);

    const employees =
      await this.companyEmployeeRepository.findCompanyEmployeesByCompanyId(
        company.id,
      );
    employees
      .filter((employee) => employee.status === CompanyEmployeeStatus.Accept)
      .forEach((employee) => ids.add(employee.employee_id));

    return Array.from(ids);
  }

  private async getVisibleCompanyCreatorIds(
    authUser: UserEntity,
    company: CompanyEntity,
  ) {
    if (this.hasAnyRole(authUser, [RoleTypes.SalesManager])) {
      return new Set([authUser.id]);
    }

    return new Set(await this.getCompanyDealCreatorIds(company));
  }

  async findOne(id: number, auth_user: UserEntity) {
    const deal = await this.dealRepository.findById(id);

    if (!deal) {
      throw new HttpException("Сделка не найдена", HttpStatus.NOT_FOUND);
    }

    const scope = await this.buildDealAccessScope(auth_user);
    if (!(await this.isDealVisibleWithinScope(deal, scope))) {
      throw new HttpException(
        "У вас недостаточно прав для получения деталей данной сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      !this.isSuperAdmin(auth_user) &&
      !this.hasAnyRole(auth_user, [RoleTypes.PartnerManager]) &&
      this.hasAnyRole(auth_user, [RoleTypes.TechnicalSpecialist])
    ) {
      return this.withDealCapabilities(deal, auth_user, {
        can_update_status: false,
        can_update_fields: false,
        can_update_configurations: false,
        can_submit: false,
        can_assign_participants: false,
        can_request_deletion: false,
        can_comment: false,
        can_decide: false,
      });
    }

    return this.withDealCapabilities(deal, auth_user);
  }

  async getDealStatistic(auth_user: UserEntity) {
    const dealsData = await this.findAll(auth_user);
    const statistic: DealStatisticsResponseDto = {
      allCount: dealsData.length,
      draft: dealsData.filter((el) => el.status === DealStatus.Draft).length,
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

    if (processDto.status === DealDeletionStatus.APPROVED) {
      const deal = await this.dealRepository.findById(request.deal_id);
      if (!deal) {
        throw new HttpException("Сделка не найдена", HttpStatus.NOT_FOUND);
      }
      const result =
        await this.dealRepository.approveDeletionRequestAndSoftDelete(
          requestId,
          request.deal_id,
          auth_user.id,
          deal.customer?.inn_normalized,
        );
      if (result === "blocked") {
        throw new HttpException(
          "Нельзя удалить опорную сделку, пока на неё ссылаются другие сделки",
          HttpStatus.CONFLICT,
        );
      }
      if (result !== "deleted") {
        throw new HttpException(
          "Заявка или сделка уже были изменены",
          HttpStatus.CONFLICT,
        );
      }
    } else {
      await this.dealDeletionRequestRepository.update(requestId, {
        status: processDto.status,
        processed_by_id: auth_user.id,
        processed_at: new Date(),
      });
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
    const previousStatus = deal.status;

    if (deal.status === DealStatus.Draft || status === DealStatus.Draft) {
      throw new HttpException(
        "Черновик можно отправить только кнопкой «Отправить»",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!(await this.canUpdateDealStatus(deal, auth_user))) {
      throw new HttpException(
        "У вас недостаточно прав для изменения этапа сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    this.assertAllowedDealStatusTransition(deal, status);

    const updatedDeal = await this.dealRepository.update(
      { id: dealId, status: previousStatus },
      { status },
    );

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Этап сделки уже был изменён другим пользователем",
        HttpStatus.CONFLICT,
      );
    }

    deal.status = status;

    if (deal.bitrix24_deal_id) {
      const distributorCompany = await this.findDistributorCompanyForDeal(deal);
      const distributor = deal.distributor_id
        ? await this.distributorRepository.findById(deal.distributor_id)
        : null;
      const distributorName =
        distributorCompany?.name || distributor?.name || deal.distributor?.name;

      this.bitrix24Service
        .updateLead(deal.bitrix24_deal_id, deal, distributorName)
        .catch((error) => {
          this.logger.error(
            `Ошибка обновления лида ${dealId} в Bitrix24:`,
            error,
          );
        });
    }

    await this.notifyDealStatusChanged(deal, status, auth_user);
    if (
      previousStatus !== DealStatus.Registered &&
      status === DealStatus.Registered
    ) {
      await this.notifyDistributorAboutApprovedDeal(deal);
    }

    return this.findOne(dealId, auth_user);
  }

  private assertAllowedDealStatusTransition(deal: any, next: DealStatus) {
    const allowed: Partial<Record<DealStatus, DealStatus[]>> = {
      [DealStatus.Moderation]: [DealStatus.Registered, DealStatus.Canceled],
      [DealStatus.Registered]: [DealStatus.Win, DealStatus.Lose],
    };

    if (!(allowed[deal.status] || []).includes(next)) {
      throw new HttpException(
        `Недопустимый переход этапа: ${deal.status} -> ${next}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      next === DealStatus.Registered &&
      deal.duplicate_review_status === DealDuplicateReviewStatus.Pending
    ) {
      throw new HttpException(
        "Завершите ручную проверку совпадения ИНН до регистрации сделки",
        HttpStatus.CONFLICT,
      );
    }
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
    const authUserCompany = await this.getUserCompany(auth_user);
    const canAssignParticipants = this.hasAnyRole(auth_user, [
      RoleTypes.SuperAdmin,
      RoleTypes.PartnerManager,
    ]);
    let creatorCompanySnapshot: CompanyEntity | null = null;
    if (!canAssignParticipants) {
      if (!deal.creator_company_id || deal.creator_id !== auth_user.id) {
        throw new HttpException(
          "Редактирование legacy-сделки требует сопоставления компании-создателя",
          HttpStatus.FORBIDDEN,
        );
      }

      creatorCompanySnapshot =
        deal.creator_company?.id === deal.creator_company_id
          ? deal.creator_company
          : await this.companyRepository.findById(deal.creator_company_id);

      if (
        !creatorCompanySnapshot ||
        !authUserCompany ||
        authUserCompany.id !== creatorCompanySnapshot.id
      ) {
        throw new HttpException(
          "Редактировать сделку можно только оставаясь участником компании-создателя",
          HttpStatus.FORBIDDEN,
        );
      }
    }

    if (
      updateDealDto.distributor_id !== undefined ||
      updateDealDto.distributor_company_id !== undefined
    ) {
      let distributorCompany: CompanyEntity | null = null;
      let distributor = null;

      if (updateDealDto.distributor_company_id !== undefined) {
        distributorCompany = await this.getAcceptedDistributorCompany(
          updateDealDto.distributor_company_id,
        );
        distributor = await this.findDistributorForCompany(distributorCompany);
      }

      if (updateDealDto.distributor_id !== undefined) {
        const requestedLegacyDistributor =
          await this.distributorRepository.findById(
            updateDealDto.distributor_id,
          );

        if (!requestedLegacyDistributor) {
          throw new HttpException(
            "Данного дистрибьютора не существует",
            HttpStatus.BAD_REQUEST,
          );
        }

        if (
          distributorCompany &&
          !this.haveSameCompanyName(
            requestedLegacyDistributor.name,
            distributorCompany.name,
          )
        ) {
          throw new HttpException(
            "Выбранные компания и запись дистрибьютора не совпадают",
            HttpStatus.BAD_REQUEST,
          );
        }

        distributor = requestedLegacyDistributor;
        distributorCompany =
          distributorCompany ||
          (await this.findAcceptedDistributorCompanyByName(
            requestedLegacyDistributor.name,
          ));
      }

      if (
        !canAssignParticipants &&
        creatorCompanySnapshot?.partnership_type ===
          PartnershipType.Distributor &&
        distributorCompany?.id !== creatorCompanySnapshot.id
      ) {
        throw new HttpException(
          "Дистрибьютор не может изменить свою сторону сделки",
          HttpStatus.FORBIDDEN,
        );
      }

      if (!distributorCompany) {
        throw new HttpException(
          "Укажите действующую компанию-дистрибьютора",
          HttpStatus.BAD_REQUEST,
        );
      }

      dealPatch.distributor_id = distributor?.id || null;
      dealPatch.distributor_company_id = distributorCompany?.id || null;
      changedFieldLabels.push("дистрибьютор");
    }

    const changesIntegrator =
      updateDealDto.integrator_company_id !== undefined ||
      updateDealDto.integrator_name !== undefined ||
      updateDealDto.integrator_inn !== undefined;

    if (changesIntegrator) {
      const integratorCompany = updateDealDto.integrator_company_id
        ? await this.getAcceptedIntegratorCompany(
            updateDealDto.integrator_company_id,
          )
        : await this.findAcceptedIntegratorCompanyByInn(
            updateDealDto.integrator_inn,
          );

      if (!integratorCompany) {
        throw new HttpException(
          "Укажите действующую компанию-интегратора",
          HttpStatus.BAD_REQUEST,
        );
      }

      this.assertRequestedIntegratorIdentityMatchesCompany(
        integratorCompany,
        updateDealDto.integrator_name,
        updateDealDto.integrator_inn,
      );

      if (
        !canAssignParticipants &&
        creatorCompanySnapshot?.partnership_type ===
          PartnershipType.Integrator &&
        integratorCompany.id !== creatorCompanySnapshot.id
      ) {
        throw new HttpException(
          "Интегратор не может изменить свою сторону сделки",
          HttpStatus.FORBIDDEN,
        );
      }

      dealPatch.integrator_company_id = integratorCompany.id;
      dealPatch.integrator_name = integratorCompany.name;
      dealPatch.integrator_inn = integratorCompany.inn;
      changedFieldLabels.push("интегратор");
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
      const { first_name, last_name, company_name, email, phone, inn } =
        updateDealDto.customer;

      if (inn !== undefined) {
        const normalizedInn = this.normalizeCustomerInn(inn);
        if (normalizedInn !== deal.customer?.inn_normalized) {
          if (deal.status !== DealStatus.Draft) {
            throw new HttpException(
              "ИНН заказчика можно исправить только в черновике",
              HttpStatus.CONFLICT,
            );
          }
          customerPatch.inn = normalizedInn;
          customerPatch.inn_normalized = normalizedInn;
          changedFieldLabels.push("ИНН заказчика");
        }
      }

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

    const nextDistributorId = Object.prototype.hasOwnProperty.call(
      dealPatch,
      "distributor_id",
    )
      ? (dealPatch.distributor_id as number | null)
      : deal.distributor_id;
    const nextDistributorCompanyId = Object.prototype.hasOwnProperty.call(
      dealPatch,
      "distributor_company_id",
    )
      ? (dealPatch.distributor_company_id as number | null)
      : deal.distributor_company_id;
    const nextIntegratorCompanyId = Object.prototype.hasOwnProperty.call(
      dealPatch,
      "integrator_company_id",
    )
      ? (dealPatch.integrator_company_id as number | null)
      : deal.integrator_company_id;
    const nextIntegratorName = Object.prototype.hasOwnProperty.call(
      dealPatch,
      "integrator_name",
    )
      ? (dealPatch.integrator_name as string | null)
      : deal.integrator_name;
    const nextIntegratorInn = Object.prototype.hasOwnProperty.call(
      dealPatch,
      "integrator_inn",
    )
      ? (dealPatch.integrator_inn as string | null)
      : deal.integrator_inn;

    if (
      (!nextDistributorCompanyId && !nextDistributorId) ||
      (!nextIntegratorCompanyId && (!nextIntegratorName || !nextIntegratorInn))
    ) {
      throw new HttpException(
        "В сделке должны быть указаны дистрибьютор и интегратор",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (hasChanges) {
      dealPatch.status = this.getStatusAfterContentChange(deal.status);

      const updatedDeal = await this.dealRepository.updateDealAndCustomerSnapshot(
        deal,
        dealPatch,
        customerPatch,
      );

      if (!updatedDeal) {
        throw new HttpException(
          "Сделка уже была отправлена или изменена другим пользователем",
          HttpStatus.CONFLICT,
        );
      }

      Object.assign(deal, dealPatch);

      if (deal.bitrix24_deal_id) {
        const distributorCompanyId = Object.prototype.hasOwnProperty.call(
          dealPatch,
          "distributor_company_id",
        )
          ? (dealPatch.distributor_company_id as number | null)
          : deal.distributor_company_id;
        const distributorCompany = distributorCompanyId
          ? await this.companyRepository.findById(distributorCompanyId)
          : null;
        const distributorId = Object.prototype.hasOwnProperty.call(
          dealPatch,
          "distributor_id",
        )
          ? (dealPatch.distributor_id as number | null)
          : deal.distributor_id;
        const distributor = distributorId
          ? await this.distributorRepository.findById(distributorId)
          : null;
        const nextDeal = deal;

        this.bitrix24Service
          .updateLead(
            deal.bitrix24_deal_id,
            nextDeal,
            distributorCompany?.name ||
              distributor?.name ||
              deal.distributor_company?.name ||
              deal.distributor?.name,
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
    const configurationActor = this.assertCanUpdateDealConfigurations(
      deal,
      auth_user,
    );

    const incomingConfigurations = addDealConfigurationsDto.configurations || [];

    if (!incomingConfigurations.length) {
      throw new HttpException(
        "Не переданы конфигурации для добавления",
        HttpStatus.BAD_REQUEST,
      );
    }

    const mutationResult = await this.dealRepository.mutateDealConfigurations(
      dealId,
      deal.status,
      configurationActor,
      { type: "append", configurations: incomingConfigurations },
    );

    if (mutationResult !== "updated") {
      throw new HttpException(
        "Сделка уже была отправлена или изменена другим пользователем",
        HttpStatus.CONFLICT,
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
    const configurationActor = this.assertCanUpdateDealConfigurations(
      deal,
      auth_user,
    );

    const mutationResult = await this.dealRepository.mutateDealConfigurations(
      dealId,
      deal.status,
      configurationActor,
      { type: "remove", configurationId },
    );

    if (mutationResult === "configuration_not_found") {
      throw new HttpException(
        "Конфигурация сделки не найдена",
        HttpStatus.NOT_FOUND,
      );
    }

    if (mutationResult !== "updated") {
      throw new HttpException(
        "Сделка уже была отправлена или изменена другим пользователем",
        HttpStatus.CONFLICT,
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
    const configurationActor = this.assertCanUpdateDealConfigurations(
      deal,
      auth_user,
    );

    const nextConfiguration = addDealConfigurationsDto.configurations?.[0];
    if (!nextConfiguration) {
      throw new HttpException(
        "Не передана конфигурация для обновления",
        HttpStatus.BAD_REQUEST,
      );
    }

    const mutationResult = await this.dealRepository.mutateDealConfigurations(
      dealId,
      deal.status,
      configurationActor,
      {
        type: "replace",
        configurationId,
        configuration: nextConfiguration as unknown as Record<string, unknown>,
      },
    );

    if (mutationResult === "configuration_not_found") {
      throw new HttpException(
        "Конфигурация сделки не найдена",
        HttpStatus.NOT_FOUND,
      );
    }

    if (mutationResult !== "updated") {
      throw new HttpException(
        "Сделка уже была отправлена или изменена другим пользователем",
        HttpStatus.CONFLICT,
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

    if (!(await this.canCommentOnDeal(deal, auth_user))) {
      throw new HttpException(
        "У вас недостаточно прав для добавления комментария к сделке",
        HttpStatus.FORBIDDEN,
      );
    }

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
    const recipientIds = await this.getDealStatusNotificationRecipientIds(
      deal,
      { includeDistributor: status !== DealStatus.Registered },
    );
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

  async notifyDistributorAboutApprovedDeal(deal: any) {
    if (deal.status !== DealStatus.Registered) return;

    const creatorCompany = await this.getDealCreatorCompany(deal);
    if (creatorCompany?.partnership_type === PartnershipType.Distributor) {
      return;
    }

    const distributorCompany = await this.findCanonicalDistributorCompany(deal);
    if (!distributorCompany) return;

    const recipientIds = await this.getCompanyAdminUserIds(
      distributorCompany.id,
    );
    await Promise.all(
      recipientIds
        .filter((userId) => userId !== deal.creator_id)
        .map((userId) =>
          this.notificationService.send({
            user_id: userId,
            title: `Сделка №${deal.deal_num} утверждена Тринити`,
            text: `После утверждения Тринити вам стала доступна сделка №${deal.deal_num}.`,
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
    if (deal.status === DealStatus.Draft) return;

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
    if (deal.status === DealStatus.Draft) return;

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

  private async getDealStatusNotificationRecipientIds(
    deal: any,
    options: { includeDistributor?: boolean } = {},
  ) {
    const recipientIds = new Set<number>();
    const creator = await this.userRepository.findByIdWithUserInfo(
      deal.creator_id,
    );

    if (creator?.id) {
      recipientIds.add(creator.id);
    }

    if (deal.responsible_manager_id) {
      recipientIds.add(deal.responsible_manager_id);
    }

    // SuperAdmin is the global fallback. Partner managers are deliberately not
    // fanned out: only the immutable deal snapshot may receive deal events.
    const trinityAdminIds = await this.findTrinityDealAdminIds([
      RoleTypes.SuperAdmin,
    ]);
    trinityAdminIds.forEach((userId) => recipientIds.add(userId));

    const distributorCompany = await this.findCanonicalDistributorCompany(deal);
    const creatorCompany = await this.getDealCreatorCompany(deal);
    const distributorCanSeeDeal =
      creatorCompany?.partnership_type === PartnershipType.Distributor ||
      [DealStatus.Registered, DealStatus.Win, DealStatus.Lose].includes(
        deal.status,
      );
    if (
      options.includeDistributor !== false &&
      distributorCompany &&
      distributorCanSeeDeal
    ) {
      const companyAdminIds = await this.getCompanyAdminUserIds(distributorCompany.id);
      companyAdminIds.forEach((userId) => recipientIds.add(userId));
    }

    const integratorCompany = deal.integrator_company_id
      ? await this.companyRepository.findOne({
          where: {
            id: deal.integrator_company_id,
            partnership_type: PartnershipType.Integrator,
            status: CompanyStatus.Accept,
          },
        })
      : null;

    if (integratorCompany) {
      const companyAdminIds = await this.getCompanyAdminUserIds(integratorCompany.id);
      companyAdminIds.forEach((userId) => recipientIds.add(userId));
    }

    return Array.from(recipientIds);
  }

  private async findTrinityDealAdminIds(
    roleNames: RoleTypes[] = [RoleTypes.SuperAdmin, RoleTypes.PartnerManager],
  ) {
    const admins = await this.userRepository
      .createQueryBuilder("u")
      .distinct(true)
      .leftJoin("user_roles", "ur", "u.id = ur.user_id")
      .leftJoin("roles", "r", "ur.role_id = r.id")
      .leftJoin("roles", "r2", "u.role_id = r2.id")
      .where("(r.name IN (:...roleNames) OR r2.name IN (:...roleNames))", {
        roleNames,
      })
      .andWhere("u.is_activated = :isActivated", { isActivated: true })
      .getMany();

    return admins.map((admin) => admin.id);
  }

  private async canUpdateDealStatus(deal: any, auth_user: UserEntity) {
    if (this.isSuperAdmin(auth_user)) return true;
    if (this.hasAnyRole(auth_user, [RoleTypes.PartnerManager])) {
      return deal.responsible_manager_id === auth_user.id;
    }
    return false;
  }

  private async withDealCapabilities(
    deal: any,
    auth_user: UserEntity,
    overrides: Record<string, boolean> = {},
  ) {
    const canDecide = await this.canUpdateDealStatus(deal, auth_user);
    const capabilities = {
      can_update_status: canDecide,
      can_update_fields: await this.canUpdateDealFields(deal, auth_user),
      can_update_configurations: this.canUpdateDealConfigurations(
        deal,
        auth_user,
      ),
      can_submit:
        deal.status === DealStatus.Draft && deal.creator_id === auth_user.id,
      can_assign_participants: this.hasAnyRole(auth_user, [
        RoleTypes.SuperAdmin,
        RoleTypes.PartnerManager,
      ]),
      can_request_deletion:
        deal.creator_id === auth_user.id && !deal.deletedAt,
      can_comment: await this.canCommentOnDeal(deal, auth_user),
      can_view_configuration: true,
      can_decide: canDecide,
    };

    const technicalReadOnlyOverrides =
      !this.isSuperAdmin(auth_user) &&
      !this.hasAnyRole(auth_user, [RoleTypes.PartnerManager]) &&
      this.hasAnyRole(auth_user, [RoleTypes.TechnicalSpecialist])
        ? {
            can_update_status: false,
            can_update_fields: false,
            can_update_configurations: false,
            can_submit: false,
            can_assign_participants: false,
            can_request_deletion: false,
            can_comment: false,
            can_decide: false,
          }
        : {};

    const result = Object.assign(
      deal,
      capabilities,
      technicalReadOnlyOverrides,
      overrides,
    );

    const canViewDuplicateReviewMetadata =
      this.isSuperAdmin(auth_user) ||
      (this.hasAnyRole(auth_user, [RoleTypes.PartnerManager]) &&
        deal.responsible_manager_id === auth_user.id);
    if (!canViewDuplicateReviewMetadata) {
      delete result.duplicate_of_deal_id;
      delete result.duplicate_of_deal;
      delete result.duplicate_review_status;
      delete result.duplicate_reviewed_by_user_id;
      delete result.duplicate_reviewed_by_user;
      delete result.duplicate_reviewed_at;
      delete result.duplicate_review_comment;
    }

    return result;
  }

  private async canCommentOnDeal(deal: any, auth_user: UserEntity) {
    if (deal.creator_id === auth_user.id || this.isSuperAdmin(auth_user)) {
      return true;
    }
    return (
      this.hasAnyRole(auth_user, [RoleTypes.PartnerManager]) &&
      deal.responsible_manager_id === auth_user.id
    );
  }

  private getStatusAfterContentChange(status: DealStatus) {
    if (status === DealStatus.Draft || status === DealStatus.Moderation) {
      return status;
    }

    return DealStatus.Moderation;
  }

  private canUpdateDealConfigurations(deal: any, auth_user: UserEntity) {
    if ([DealStatus.Win, DealStatus.Lose].includes(deal.status)) return false;
    return (
      deal.creator_id === auth_user.id ||
      this.isSuperAdmin(auth_user) ||
      (this.hasAnyRole(auth_user, [RoleTypes.PartnerManager]) &&
        deal.responsible_manager_id === auth_user.id)
    );
  }

  private getDealConfigurationMutationActor(
    deal: any,
    auth_user: UserEntity,
  ) {
    if (this.isSuperAdmin(auth_user)) {
      return { kind: "super_admin" as const, userId: auth_user.id };
    }
    if (deal.creator_id === auth_user.id) {
      return { kind: "creator" as const, userId: auth_user.id };
    }
    if (
      this.hasAnyRole(auth_user, [RoleTypes.PartnerManager]) &&
      deal.responsible_manager_id === auth_user.id
    ) {
      return { kind: "responsible_manager" as const, userId: auth_user.id };
    }
    return null;
  }

  private assertCanUpdateDealConfigurations(deal: any, auth_user: UserEntity) {
    const actor = this.getDealConfigurationMutationActor(deal, auth_user);
    if (!actor) {
      throw new HttpException(
        "Редактировать конфигурации может создатель или ответственный сотрудник Тринити",
        HttpStatus.FORBIDDEN,
      );
    }

    if ([DealStatus.Win, DealStatus.Lose].includes(deal.status)) {
      throw new HttpException(
        "Нельзя редактировать конфигурации завершенной сделки",
        HttpStatus.BAD_REQUEST,
      );
    }
    return actor;
  }

  private async canUpdateDealFields(deal: any, auth_user: UserEntity) {
    if (deal.creator_id === auth_user.id) {
      return true;
    }

    if (this.isSuperAdmin(auth_user)) return true;
    return (
      this.hasAnyRole(auth_user, [RoleTypes.PartnerManager]) &&
      deal.responsible_manager_id === auth_user.id
    );
  }

  private isDealVisibleForCompany(
    deal: any,
    company?: CompanyEntity | null,
    companyCreatorIds: Set<number> = new Set<number>(),
    canViewAllCompanyCreatedDeals = true,
  ) {
    if (!company) return false;

    if (
      deal.creator_company_id !== null &&
      deal.creator_company_id !== undefined
    ) {
      if (
        deal.creator_company_id === company.id &&
        (canViewAllCompanyCreatedDeals ||
          companyCreatorIds.has(deal.creator_id))
      ) {
        return true;
      }
    }

    if (
      company.partnership_type === PartnershipType.Integrator &&
      deal.integrator_company_id === company.id
    ) {
      return deal.status !== DealStatus.Draft;
    }

    if (company.partnership_type === PartnershipType.Distributor) {
      const isParticipant = deal.distributor_company_id === company.id;

      return (
        isParticipant &&
        [DealStatus.Registered, DealStatus.Win, DealStatus.Lose].includes(
          deal.status,
        )
      );
    }

    return false;
  }

  private async findDistributorCompanyForDeal(deal: any) {
    if (
      deal.distributor_company?.partnership_type ===
        PartnershipType.Distributor &&
      deal.distributor_company.status === CompanyStatus.Accept
    ) {
      return deal.distributor_company;
    }

    if (deal.distributor_company_id) {
      return this.companyRepository.findOne({
        where: {
          id: deal.distributor_company_id,
          partnership_type: PartnershipType.Distributor,
          status: CompanyStatus.Accept,
        },
      });
    }

    const distributorName = deal.distributor?.name;
    if (!distributorName) return null;

    return this.findAcceptedDistributorCompanyByName(distributorName);
  }

  /**
   * Authorization and notification recipients must be anchored to the
   * immutable company FK. Legacy display names are never identity proof.
   */
  private async findCanonicalDistributorCompany(deal: any) {
    if (!deal.distributor_company_id) return null;

    if (
      deal.distributor_company?.id === deal.distributor_company_id &&
      deal.distributor_company.partnership_type ===
        PartnershipType.Distributor &&
      deal.distributor_company.status === CompanyStatus.Accept
    ) {
      return deal.distributor_company;
    }

    return this.companyRepository.findOne({
      where: {
        id: deal.distributor_company_id,
        partnership_type: PartnershipType.Distributor,
        status: CompanyStatus.Accept,
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
    if (deal.status === DealStatus.Draft) {
      throw new HttpException(
        "Сначала отправьте черновик сделки",
        HttpStatus.BAD_REQUEST,
      );
    }
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
      const synced = await this.sendLeadToBitrix24(
        deal,
        customer,
        distributor,
        creator,
        true,
      );

      if (!synced) {
        throw new HttpException(
          "Лид уже синхронизируется или Bitrix24 недоступен",
          HttpStatus.CONFLICT,
        );
      }

      return { success: true, message: "Лид отправлен в Bitrix24" };
    } catch (error) {
      this.logger.error(
        `Ошибка принудительной отправки лида ${dealId}:`,
        error,
      );
      if (error instanceof HttpException) throw error;
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

    const deleted = await this.dealRepository.softDeleteWithDuplicateGuard(
      id,
      deal.customer?.inn_normalized,
    );
    if (!deleted) {
      throw new HttpException(
        "Нельзя удалить опорную сделку, пока на неё ссылаются другие сделки",
        HttpStatus.CONFLICT,
      );
    }
  }
}
