import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateDealDto } from './dto/request/create-deal.dto';
import { UpdateDealDto } from './dto/request/update-deal.dto';
import { CustomerRepository, DealRepository, DistributorRepository, UserRepository } from '@orm/repositories';

@Injectable()
export class DealService {
  constructor(
    private readonly distributorRepository: DistributorRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository,
    private readonly dealRepository: DealRepository
  ) {

  }
  async create(createDealDto: CreateDealDto) {
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

  findAll() {
    return `This action returns all deal`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deal`;
  }

  update(id: number, updateDealDto: UpdateDealDto) {
    return `This action updates a #${id} deal`;
  }

  remove(id: number) {
    return `This action removes a #${id} deal`;
  }
}
