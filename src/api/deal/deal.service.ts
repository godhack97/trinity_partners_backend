import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { UpdateDealDto } from './dto/request/update-deal.dto';
import { CompanyRepository, CustomerRepository, DealRepository, DistributorRepository, UserRepository } from '@orm/repositories';
import { RoleTypes } from '@app/types/RoleTypes';
import { DealEntity, DealStatus } from '@orm/entities';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';

@Injectable()
export class DealService {
  constructor(
    private readonly distributorRepository: DistributorRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository,
    private readonly dealRepository: DealRepository,
    private readonly companyRepository: CompanyRepository
  ) {

  }
  async create(request: Request, createDealDto: CreateDealDto):  Promise<DealEntity> {
    
    const token = this.extractToken(request);
    const role = await this.getUserRole(token);

    if(role.userId !== createDealDto.partner_id) {
      throw new HttpException('Вы не можете создавать сделки за других пользователей', HttpStatus.FORBIDDEN);
    }
    
    const user = await this.userRepository.findById(createDealDto.partner_id);
    const distributor = await this.distributorRepository.findById(createDealDto.distributor_id);
    const customer = await this.customerRepository.findById(createDealDto.customer_id);

    if(!user) {
      throw new HttpException('Данного пользователя не существует', HttpStatus.FORBIDDEN);
    }

    if(!distributor ) {
      throw new HttpException('Данного дистрибьютора не существует', HttpStatus.FORBIDDEN);
    }

    if(!customer) {
      throw new HttpException('Данного заказчика не существует', HttpStatus.FORBIDDEN);
    }

    const countDealsInDay = await this.dealRepository.countDealsForToday();
    const date = new Date();

    createDealDto.deal_num = `${user.id}-${date.getFullYear()}/${(date.getMonth() + 1).toString()
    .padStart(2, '0')}/${date.getDate()
    .toString().padStart(2, '0')}-${countDealsInDay+1}`;

    createDealDto.purchase_date = new Date(createDealDto.purchase_date)

    return this.dealRepository.save(createDealDto);
  }

  async findAll(request: Request, entry?: SearchDealDto) {
    
    const token = this.extractToken(request);
    const role = await this.getUserRole(token);

    let deals =[];

    switch (role.role) {
      case RoleTypes.SuperAdmin:
      deals = await this.dealRepository.findDealsWithFilters(entry);
      break;

      // Проверить это после реализации добавления сотрудников к компании
      // Также нужно реализовать кейс для RoleTypes.EmployeeAdmin
      case RoleTypes.Partner:
      const companyWithEmployees = await this.companyRepository.findByOwnerId(role.userId);
      const employeeIds = companyWithEmployees.employee.map(el => el.id);
      deals = await this.dealRepository.findDealsWithFilters(entry);
      deals = deals.filter(deal => 
        deal.partner_id === companyWithEmployees.owner_id || employeeIds.includes(deal.partner_id)
      );
      break;

      case RoleTypes.Employee:
      deals = await this.dealRepository.findDealsWithFilters(entry);
      deals = deals.filter(deal => deal.partner_id === role.userId);
      break;

      default:
      deals = [];
      break;
      }

    return deals;
  }

  async findOne(id: number, request: Request) {
    const token = this.extractToken(request);
    const role = await this.getUserRole(token);

    const deal = await this.dealRepository.findById(id);

    if(!deal) {
      throw new HttpException('Сделка не найдена', HttpStatus.FORBIDDEN);
    }

    switch (role.role) {
      case RoleTypes.SuperAdmin:
      return deal;
      
      // Проверить это после реализации добавления сотрудников к компании
      // Также нужно реализовать кейс для RoleTypes.EmployeeAdmin
      
      case RoleTypes.Partner:
      const companyWithEmployees = await this.companyRepository.findByOwnerId(role.userId);
      const isEmployeesDeal = companyWithEmployees.employee.some(el => deal.partner_id === el.id);
      
      if (deal.partner_id === companyWithEmployees.owner_id || isEmployeesDeal) {
        return deal;
      } else {
        throw new HttpException('У вашей компании недостаточно прав для получения деталей данной сделки', HttpStatus.FORBIDDEN);
      }
      
      case RoleTypes.Employee:
      if (role.userId === deal.partner_id) {
        return deal;
      } else {
        throw new HttpException('У вас недостаточно прав для получения деталей данной сделки', HttpStatus.FORBIDDEN);
      }
      
      default:
        throw new HttpException('У вас недостаточно прав для получения деталей данной сделки', HttpStatus.FORBIDDEN);
    }
      
  }

  async getDealStatistic(request: Request) {
    const dealsData = await this.findAll(request);
    const statistic: DealStatisticsResponseDto = {
      allCount: dealsData.length,
      canceled: dealsData.filter(el => el.status === DealStatus.Canceled).length,
      registered: dealsData.filter(el => el.status === DealStatus.Registered).length,
      moderation: dealsData.filter(el => el.status === DealStatus.Moderation).length,
    };

    return statistic;
  }

  update(id: number, updateDealDto: UpdateDealDto) {
    return `This action updates a #${id} deal`;
  }

  remove(id: number) {
    return `This action removes a #${id} deal`;
  }


  //Вынести в отдельный сервис при необходимости
  private extractToken(request: Request): string {

    const headers = request.headers as { authorization?: string };
    const _token: string = headers.authorization || '';
    if (_token.length === 0) {
      throw new HttpException('Пользователь не авторизован', HttpStatus.UNAUTHORIZED);
    }
      return _token.substring(7); 
  }
    
  private async getUserRole(token: string) {
    const user = await this.userRepository.findOneBy({ token });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    }
      return { role: user.role.name, userId: user.id }
  }
}