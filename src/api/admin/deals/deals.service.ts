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
    //Кому отправляем? кастомеру или дистрибьютору? или обоим?
    await this.changeStatusNotify({deal});

    //Чем специальная special_discount отличается от special_price, условие на шару пока поставил
    if(updateDealDto.special_discount) {
      //Кому отправляем? кастомеру или дистрибьютору? или обоим?
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
      //Статус на английском DealStatus надо бы переводы? перевел в яндексе)))
      text: `Обновление статуса Сделка №${deal.id} - сделка ${DealStatusRu[deal.status]}`,
    })
  }

  private async specialDiscountNotify({deal}) {
    await this.notificationService.send({
      user_id: deal.customer_id,
      title: 'Выдана скидка',
      text: `По сделке №${deal.id} выдана скидка ${deal.special_discount}`,
    })
  }
}
