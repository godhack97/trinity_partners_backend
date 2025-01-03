import { NotificationService } from "@api/notification/notification.service";
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DealStatusRu } from "@orm/entities";
import { UpdateDealDto } from './dto/request/update-deals.dto';
import { DealRepository } from '@orm/repositories';

@Injectable()
export class DealsService {

  constructor(
    private readonly dealRepository: DealRepository,
    private readonly notificationService: NotificationService,
  ) {}
 
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
    const deal = await this.dealRepository.findById(id);
    await this.changeStatusNotify({deal});

    if(updateDealDto.special_discount) {
      await this.specialDiscountNotify({deal});
    }

    return {
      message: `Сделка с id ${id} была успешно обновлена`,
      success: true,
    };  
  }

  private async changeStatusNotify({deal}) {
    await this.notificationService.send({
      user_id: deal.customer_id,
      title: 'Статус сделки',
      text: `Обновление статуса Сделка №${deal.id} - сделка ${DealStatusRu[deal.status]}`,
    })
  }

  private async specialDiscountNotify({deal}) {
    await this.notificationService.send({
      user_id: deal.customer_id,
      title: 'Выдана скидка',
      text: `По сделке №${deal.id} выдана скидка на ${deal.special_discount} ${deal.special_discount.indexOf('%') > -1 ? 'процентов': 'рублей'}`,
    })
  }
}
