import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CreateDealDto } from "./dto/request/create-deal.dto";
import {
  CompanyRepository,
  CustomerRepository,
  DealRepository,
  DistributorRepository,
  DealDeletionRequestRepository,
} from "@orm/repositories";
import { RoleTypes } from "@app/types/RoleTypes";
import { DealStatus, UserEntity, Bitrix24SyncStatus } from "@orm/entities";
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
    private configService: ConfigService,
  ) {}

  private get hostname(): string {
    return this.configService.get<string>("HOSTNAME") || "localhost";
  }

  private hasRole(user: UserEntity, roleName: string): boolean {
    if (user.role?.name === roleName) {
      return true;
    }
    return user.roles?.some(role => role.name === roleName) || false;
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
    const distributor = await this.distributorRepository.findById(
      createDealDto.distributor_id,
    );

    const existingCustomer = await this.customerRepository.findSimilar(
      createDealDto.customer.inn,
      createDealDto.customer.email,
      createDealDto.customer.first_name,
      createDealDto.customer.last_name,
    );

    const customer =
      existingCustomer ||
      (await this.customerRepository.save(createDealDto.customer));

    if (!distributor) {
      throw new HttpException(
        "Данного дистрибьютора не существует",
        HttpStatus.FORBIDDEN,
      );
    }

    if (!customer) {
      throw new HttpException(
        "Произошла ошибка при создании заказчика",
        HttpStatus.FORBIDDEN,
      );
    }

    const countDealsInDay = await this.dealRepository.countDealsForToday();
    const date = new Date();

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
    };

    if (dealData.customer_id) {
      delete dealData.customer;
    }

    const savedDeal = await this.dealRepository.save(dealData);

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

    return savedDeal;
  }

  private async notifyAdminsAboutNewDeal(
    deal: any,
    customer: any,
    distributor: any,
    creator: UserEntity,
  ) {
    try {
      const qb = this.userRepository.createQueryBuilder("u");
      qb.leftJoin("user_roles", "ur", "u.id = ur.user_id")
        .leftJoin("roles", "r", "ur.role_id = r.id")
        .leftJoin("roles", "r2", "u.role_id = r2.id")
        .where("(r.id = 1 OR r2.id = 1)");

      const superAdmins = await qb.getMany();

      const creatorWithInfo = await this.userRepository.findByIdWithUserInfo(
        creator.id,
      );

      for (const admin of superAdmins) {
        await this.emailConfirmerService.emailSend({
          email: admin.email,
          subject: "Создана новая сделка",
          template: "admin-new-deal-notification",
          context: {
            adminName: admin.user_info?.first_name || "Администратор",
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
      }
    } catch (error) {
      console.error(
        "Ошибка отправки уведомления админам о новой сделке:",
        error,
      );
    }
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
    } else if (
      this.hasRole(auth_user, RoleTypes.EmployeeAdmin) ||
      this.hasRole(auth_user, RoleTypes.Partner) ||
      this.hasRole(auth_user, RoleTypes.Employee)
    ) {
      deals = await this.dealRepository.findDealsWithFilters(entry);
      deals = deals.filter((deal) => deal.creator_id === auth_user.id);
    } else {
      deals = [];
    }

    return deals;
  }

  async findOne(id: number, auth_user: UserEntity) {
    const deal = await this.dealRepository.findById(id);

    if (!deal) {
      throw new HttpException("Сделка не найдена", HttpStatus.NOT_FOUND);
    }

    if (this.isSuperAdmin(auth_user)) {
      return deal;
    }

    if (
      this.hasRole(auth_user, RoleTypes.EmployeeAdmin) ||
      this.hasRole(auth_user, RoleTypes.Partner)
    ) {
      const companyWithEmployees =
        await this.companyRepository.findByIdWithEmployees(
          auth_user?.company_employee?.company_id,
        );

      if (auth_user.id === deal.creator_id) {
        return deal;
      }

      throw new HttpException(
        "У вашей компании недостаточно прав для получения деталей данной сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    if (this.hasRole(auth_user, RoleTypes.Employee)) {
      if (auth_user.id === deal.creator_id) {
        return deal;
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

    const updatedDeal = await this.dealRepository.update(dealId, { status });

    if (deal.bitrix24_deal_id) {
      const distributor = await this.distributorRepository.findById(
        deal.distributor_id,
      );
      const distributorName = distributor?.name || distributor?.name;

      this.bitrix24Service
        .updateLead(deal.bitrix24_deal_id, deal, distributorName)
        .catch((error) => {
          this.logger.error(
            `Ошибка обновления лида ${dealId} в Bitrix24:`,
            error,
          );
        });
    }

    return updatedDeal;
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