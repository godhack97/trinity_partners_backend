import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { CompanyRepository, CustomerRepository, DealRepository, DistributorRepository } from '@orm/repositories';
import { RoleTypes } from '@app/types/RoleTypes';
import {
  DealStatus,
  UserEntity
} from '@orm/entities';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';

@Injectable()
export class DealService {
  constructor(
    private readonly distributorRepository: DistributorRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly dealRepository: DealRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}
  async create(auth_user: UserEntity, createDealDto: CreateDealDto)  /*Promise<DealEntity>*/ {
    const distributor = await this.distributorRepository.findById(createDealDto.distributor_id);
    const customer = await this.customerRepository.save(createDealDto.customer);

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

    return this.dealRepository.save(dealData);
  }

  async findAll(auth_user: UserEntity, entry?: SearchDealDto) {
    let deals: any[];

    console.log('auth_user', auth_user);


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

    return []; //deals;
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
        //const isEmployeesDeal = companyWithEmployees.employee.some(el => deal.creator_id === el.id);
      
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
}
