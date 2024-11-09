import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { UpdateDealDto } from './dto/request/update-deal.dto';
import { CompanyRepository, CustomerRepository, DealRepository, DistributorRepository, UserRepository } from '@orm/repositories';
import { RoleTypes } from '@app/types/RoleTypes';
import { CompanyEmployeeStatus, DealEntity, DealStatus } from '@orm/entities';
import { SearchDealDto } from './dto/request/search-deal.dto';
import { DealStatisticsResponseDto } from './dto/response/deal-statistics-response.dto';
import { AuthTokenService } from '@app/services/auth-token/auth-token.service';

@Injectable()
export class DealService {
  constructor(
    private readonly distributorRepository: DistributorRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository,
    private readonly dealRepository: DealRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly authTokenService: AuthTokenService,
  ) {

  }
  async create(request: Request, createDealDto: CreateDealDto):  Promise<DealEntity> {
  
    const token = this.authTokenService.extractToken(request);
    const role = await this.authTokenService.getUserRole(token);
    
    const distributor = await this.distributorRepository.findById(createDealDto.distributor_id);
    const customer = await this.customerRepository.findById(createDealDto.customer_id);

    if(!distributor) {
      throw new HttpException('Данного дистрибьютора не существует', HttpStatus.FORBIDDEN);
    }

    if(!customer) {
      throw new HttpException('Данного заказчика не существует', HttpStatus.FORBIDDEN);
    }

    const countDealsInDay = await this.dealRepository.countDealsForToday();
    const date = new Date();

    const deal_num = `${role.userId}-${date.getFullYear()}/${(date.getMonth() + 1).toString()
      .padStart(2, '0')}/${date.getDate()
      .toString().padStart(2, '0')}-${countDealsInDay+1}`;

    createDealDto.purchase_date = new Date(createDealDto.purchase_date);

    const dealData = {
      ...createDealDto,
      partner_id: role.userId,
      deal_num
    }

    return this.dealRepository.save(dealData);
  }

  async findAll(request: Request, entry?: SearchDealDto) {
    
    const token = this.authTokenService.extractToken(request);
    const role =  await this.authTokenService.getUserRole(token);

    let deals =[];

    switch (role.role) {
      case RoleTypes.SuperAdmin:
        deals = await this.dealRepository.findDealsWithFilters(entry);
        break;

      case RoleTypes.EmployeeAdmin:
      case RoleTypes.Partner:
        const companyWithEmployees = await this.companyRepository.findByIdWithEmployees(role.companyId);
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
    const token = this.authTokenService.extractToken(request);
    const role =  await this.authTokenService.getUserRole(token);

    const deal = await this.dealRepository.findById(id);

    if(!deal) {
      throw new HttpException('Сделка не найдена', HttpStatus.NOT_FOUND);
    }

    switch (role.role) {
      case RoleTypes.SuperAdmin:
        return deal;
      
      case RoleTypes.EmployeeAdmin:
      case RoleTypes.Partner:
        const companyWithEmployees = await this.companyRepository.findByIdWithEmployees(role.companyId);
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
}
