import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { CompanyRepository, CustomerRepository, DealRepository, DistributorRepository } from '@orm/repositories';
import { RoleTypes } from '@app/types/RoleTypes';
import {
  DealStatus,
  UserEntity,
  Bitrix24SyncStatus
} from '@orm/entities';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';
import { Bitrix24Service } from '../../integrations/bitrix24/bitrix24.service';
import { UserRepository } from 'src/orm/repositories/user.repository';
import { EmailConfirmerService } from '@api/email-confirmer/email-confirmer.service';


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
  ) {}

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
    return await this.dealRepository.count({ where: { status: DealStatus.Moderation } });
  }

  async getRegisteredCount(): Promise<number> {
    return await this.dealRepository.count({ where: { status: DealStatus.Registered } });
  }

  async getCanceledCount(): Promise<number> {
    return await this.dealRepository.count({ where: { status: DealStatus.Canceled } });
  }

  async getWinCount(): Promise<number> {
    return await this.dealRepository.count({ where: { status: DealStatus.Win } });
  }

  async getLooseCount(): Promise<number> {
    return await this.dealRepository.count({ where: { status: DealStatus.Lose } });
  }

  async create(auth_user: UserEntity, createDealDto: CreateDealDto) {
    const distributor = await this.distributorRepository.findById(createDealDto.distributor_id);

    const existingCustomer = await this.customerRepository.findSimilar(
      createDealDto.customer.inn,
      createDealDto.customer.email,
      createDealDto.customer.first_name,
      createDealDto.customer.last_name
    );

    const customer = existingCustomer || await this.customerRepository.save(createDealDto.customer);

    if(!distributor) {
      throw new HttpException('Данного дистрибьютора не существует', HttpStatus.FORBIDDEN);
    }

    if(!customer) {
      throw new HttpException('Произошла ошибка при создании заказчика', HttpStatus.FORBIDDEN);
    }

    const countDealsInDay = await this.dealRepository.countDealsForToday();
    const date = new Date();

    const deal_num = `${auth_user.id}-${date.getFullYear()}/${(date.getMonth() + 1).toString()
      .padStart(2, '0')}/${date.getDate()
      .toString().padStart(2, '0')}-${countDealsInDay+1}`;

    createDealDto.purchase_date = new Date(createDealDto.purchase_date);

    const dealData = {
      ...createDealDto,
      customer_id: customer.id,
      creator_id: auth_user.id,
      deal_num
    }

    if (dealData.customer_id) {
      delete dealData.customer;
    }

    const savedDeal = await this.dealRepository.save(dealData);

    this.sendLeadToBitrix24(savedDeal, customer, distributor, auth_user).catch(error => {
      this.logger.error(`Ошибка отправки лида для сделки ${savedDeal.id} в Bitrix24:`, error);
    });

    await this.notifyAdminsAboutNewDeal(savedDeal, customer, distributor, auth_user);

    return savedDeal;
  }


  private async notifyAdminsAboutNewDeal(
    deal: any,
    customer: any,
    distributor: any,
    creator: UserEntity
  ) {
    try {
      const superAdmins = await this.userRepository.find({
        where: { role_id: 1 },
      });
      const creatorWithInfo = await this.userRepository.findByIdWithUserInfo(creator.id);

      for (const admin of superAdmins) {
        await this.emailConfirmerService.emailSend({
          email: admin.email,
          subject: 'Создана новая сделка',
          template: 'admin-new-deal-notification',
          context: {
            adminName: admin.info?.first_name || 'Администратор',
            dealNumber: deal.deal_num,
            dealId: deal.id,
            customerFirstName: customer.first_name,
            customerLastName: customer.last_name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            distributorName: distributor.name,
            distributorId: distributor.id,
            creatorName: creatorWithInfo.user_info?.first_name && creatorWithInfo.user_info?.last_name
            ? `${creatorWithInfo.user_info.first_name} ${creatorWithInfo.user_info.last_name}`
            : creatorWithInfo.email,
            creatorEmail: creatorWithInfo.email,
            creationDate: new Date().toLocaleDateString('ru-RU'),
            purchaseDate: deal.purchase_date ? new Date(deal.purchase_date).toLocaleDateString('ru-RU') : null,
            amount: deal.amount,
            status: deal.status,
            description: deal.description,
          },
        });
      }
    } catch (error) {
      console.error('Ошибка отправки уведомления админам о новой сделке:', error);
    }
  }

  /**
   * Отправка лида в Bitrix24
   */
  private async sendLeadToBitrix24(deal: any, customer: any, distributor?: any, creator?: UserEntity): Promise<void> {
    try {
      this.logger.log(`Отправка лида для сделки ${deal.id} в Bitrix24...`);

      const distributorName = distributor?.name || distributor?.company_name || `Distributor_${deal.distributor_id}`;

      let dealCreator = creator;
      if (!dealCreator && deal.creator_id) {
        dealCreator = await this.userRepository.findByIdWithUserInfo(deal.creator_id);
      }

      if (!dealCreator) {
        this.logger.error(`Не удалось найти создателя сделки ${deal.id}`);
        await this.dealRepository.update(deal.id, {
          bitrix24_sync_status: Bitrix24SyncStatus.FAILED
        });
        return;
      }

      const dealWithPartner = {
        ...deal,
        partner: dealCreator,
        customer: customer
      };

      const leadId = await this.bitrix24Service.createLead(dealWithPartner, customer, distributorName);

      if (leadId) {
        await this.dealRepository.update(deal.id, {
          bitrix24_deal_id: leadId,
          bitrix24_sync_status: Bitrix24SyncStatus.SYNCED,
          bitrix24_synced_at: new Date()
        });
        this.logger.log(`Лид для сделки ${deal.id} успешно создан в Bitrix24 с ID: ${leadId}`);
      } else {
        await this.dealRepository.update(deal.id, {
          bitrix24_sync_status: Bitrix24SyncStatus.FAILED
        });
        this.logger.warn(`Не удалось создать лид для сделки ${deal.id} в Bitrix24`);
      }
    } catch (error) {
      this.logger.error(`Ошибка при отправке лида для сделки ${deal.id} в Bitrix24:`, error);

      await this.dealRepository.update(deal.id, {
        bitrix24_sync_status: Bitrix24SyncStatus.FAILED
      });
    }
  }

  async findAll(auth_user: UserEntity, entry?: SearchDealDto) {
    let deals: any[];

    switch (auth_user.role.name) {
      case RoleTypes.SuperAdmin:
        deals = await this.dealRepository.findDealsWithFilters(entry);
        break;

      case RoleTypes.EmployeeAdmin:
      case RoleTypes.Partner:
      case RoleTypes.Employee:
        deals = await this.dealRepository.findDealsWithFilters(entry);
        deals = deals.filter(deal => deal.creator_id === auth_user.id);
        break;

      default:
        deals = [];
        break;
      }

    return deals;
  }

  async findOne(id: number, auth_user: UserEntity) {
    const deal = await this.dealRepository.findById(id);

    if(!deal) {
      throw new HttpException('Сделка не найдена', HttpStatus.NOT_FOUND);
    }

    switch (auth_user.role.name) {
      case RoleTypes.SuperAdmin:
        return deal;

      case RoleTypes.EmployeeAdmin:
      case RoleTypes.Partner:
        const companyWithEmployees = await this.companyRepository.findByIdWithEmployees(auth_user?.company_employee?.company_id);

        if (auth_user.id === deal.creator_id) {
          return deal;
        }

        throw new HttpException('У вашей компании недостаточно прав для получения деталей данной сделки', HttpStatus.FORBIDDEN);

      case RoleTypes.Employee:
        if (auth_user.id === deal.creator_id) {
          return deal;
        }
        throw new HttpException('У вас недостаточно прав для получения деталей данной сделки', HttpStatus.FORBIDDEN);

      default:
        throw new HttpException('У вас недостаточно прав для получения деталей данной сделки', HttpStatus.FORBIDDEN);
    }
  }

  async getDealStatistic(auth_user: UserEntity) {
    const dealsData = await this.findAll(auth_user);
    const statistic: DealStatisticsResponseDto = {
      allCount: dealsData.length,
      canceled: dealsData.filter(el => el.status === DealStatus.Canceled).length,
      registered: dealsData.filter(el => el.status === DealStatus.Registered).length,
      moderation: dealsData.filter(el => el.status === DealStatus.Moderation).length,
      win: dealsData.filter(el => el.status === DealStatus.Win).length,
      loose: dealsData.filter(el => el.status === DealStatus.Lose).length,
    };

    return statistic;
  }

  /**
   * Обновление статуса сделки (с синхронизацией лида в Bitrix24)
   */
  async updateDealStatus(dealId: number, status: DealStatus, auth_user: UserEntity): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);

    const updatedDeal = await this.dealRepository.update(dealId, { status });

    if (deal.bitrix24_deal_id) {
      const distributor = await this.distributorRepository.findById(deal.distributor_id);
      const distributorName = distributor?.name || distributor?.name;

      this.bitrix24Service.updateLead(deal.bitrix24_deal_id, deal, distributorName).catch(error => {
        this.logger.error(`Ошибка обновления лида ${dealId} в Bitrix24:`, error);
      });
    }

    return updatedDeal;
  }

  /**
   * Конвертация лида в сделку в Bitrix24
   */
  async convertLeadToDeal(dealId: number, auth_user: UserEntity): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);

    if (!deal.bitrix24_deal_id) {
      throw new HttpException('Лид не найден в Bitrix24', HttpStatus.NOT_FOUND);
    }

    try {
      const result = await this.bitrix24Service.convertLead(deal.bitrix24_deal_id);

      if (result?.dealId) {
        this.logger.log(`Лид ${deal.bitrix24_deal_id} конвертирован в сделку ${result.dealId}`);

        return {
          success: true,
          leadId: deal.bitrix24_deal_id,
          dealId: result.dealId,
          contactId: result.contactId
        };
      }

      throw new HttpException('Не удалось конвертировать лид', HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (error) {
      this.logger.error(`Ошибка конвертации лида ${dealId}:`, error);
      throw new HttpException('Ошибка конвертации лида', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Принудительная отправка лида в Bitrix24
   */
  async forceSendToBitrix24(dealId: number, auth_user: UserEntity): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);
    const customer = await this.customerRepository.findById(deal.customer_id);
    const distributor = await this.distributorRepository.findById(deal.distributor_id);

    const creator = await this.userRepository.findByIdWithUserInfo(deal.creator_id);

    if (!customer) {
      throw new HttpException('Клиент не найден', HttpStatus.NOT_FOUND);
    }

    if (!creator) {
      throw new HttpException('Создатель сделки не найден', HttpStatus.NOT_FOUND);
    }

    try {
      await this.dealRepository.update(dealId, {
        bitrix24_sync_status: Bitrix24SyncStatus.PENDING
      });

      await this.sendLeadToBitrix24(deal, customer, distributor, creator);

      return { success: true, message: 'Лид отправлен в Bitrix24' };
    } catch (error) {
      this.logger.error(`Ошибка принудительной отправки лида ${dealId}:`, error);
      throw new HttpException('Ошибка отправки лида', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Проверка подключения к Bitrix24
   */
  async checkBitrix24Connection(): Promise<boolean> {
    return this.bitrix24Service.checkConnection();
  }

  /**
   * Получение статуса синхронизации лида
   */
  async getBitrix24SyncStatus(dealId: number, auth_user: UserEntity): Promise<any> {
    const deal = await this.findOne(dealId, auth_user);

    return {
      dealId: deal.id,
      bitrix24Id: deal.bitrix24_deal_id,
      syncStatus: deal.bitrix24_sync_status,
      syncedAt: deal.bitrix24_synced_at,
      isLead: true
    };
  }

  async remove(id: number, auth_user: UserEntity): Promise<void> {
    if (auth_user.role_id !== 1) {
      throw new HttpException('У вас недостаточно прав для удаления сделки', HttpStatus.FORBIDDEN);
    }

    const deal = await this.dealRepository.findById(id);

    if (!deal) {
      throw new HttpException('Сделка не найдена', HttpStatus.NOT_FOUND);
    }

    await this.dealRepository.softDelete(id);
  }
}