import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdateDealDto } from './dto/request/update-deals.dto';
import { DealRepository } from '@orm/repositories';

@Injectable()
export class DealsService {

  constructor(private readonly dealRepository: DealRepository) {}

 
  async update(id: number, updateDealDto: UpdateDealDto) {
    const updatedDeal = await this.dealRepository.update(id, {
      status: updateDealDto.status,
      special_discount: updateDealDto.special_discount || null,
      special_price: updateDealDto.special_price || null,
      discount_date: updateDealDto.discount_date || null
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException('Не удалось обновить сделку', HttpStatus.INTERNAL_SERVER_ERROR);
    }
      
    return {
      message: `Сделка с id ${id} была успешно обновлена`,
      succes: true,
    };  
  }
}
