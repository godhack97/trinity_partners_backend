import { NotificationService } from "@api/notification/notification.service";
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DealDuplicateReviewStatus,
  DealStatusRu,
  NotificationCategory,
} from "@orm/entities";
import { UpdateDealDto } from "./dto/request/update-deals.dto";
import { DealRepository } from "@orm/repositories";
import { CURRENCY } from "@config/constants";

@Injectable()
export class AdminDealService {
  constructor(
    private readonly dealRepository: DealRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async update(id: number, updateDealDto: UpdateDealDto) {
    let deal = await this.dealRepository.findById(id);
    if (!deal) throw new NotFoundException();

    const { deal_sum } = deal;
    const special_discount = updateDealDto.special_discount || null;
    let special_price: null | number;
    let discount_date = updateDealDto.discount_date;

    if (special_discount) {
      special_price = special_discount.includes("%")
        ? deal_sum - (deal_sum * +special_discount.replace("%", "")) / 100
        : deal_sum - +special_discount;
    } else {
      special_price = null;
      discount_date = null;
    }

    const updatedDeal = await this.dealRepository.update(id, {
      status: updateDealDto.status,
      special_discount: updateDealDto.special_discount || null,
      special_price,
      discount_date,
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось обновить сделку",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    deal = await this.dealRepository.findById(id);

    await this.changeStatusNotify({ deal });

    if (updateDealDto.special_discount) {
      await this.specialDiscountNotify({ deal });
    }

    return {
      message: `Сделка с id ${id} была успешно обновлена`,
      success: true,
    };
  }

  async reviewDuplicate(
    id: number,
    status: "duplicate" | "not_duplicate",
  ) {
    const deal = await this.dealRepository.findById(id);
    if (!deal) throw new NotFoundException();

    if (!Object.values(DealDuplicateReviewStatus).includes(status as DealDuplicateReviewStatus)) {
      throw new HttpException(
        "Некорректный статус проверки дубля",
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!deal.duplicate_of_deal_id) {
      throw new HttpException(
        "У сделки нет связанной похожей сделки",
        HttpStatus.BAD_REQUEST,
      );
    }

    const updatedDeal = await this.dealRepository.update(id, {
      duplicate_review_status: status as DealDuplicateReviewStatus,
    });

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось обновить статус проверки дубля",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.notificationService.send({
      user_id: deal.creator_id,
      title: "Проверка похожей сделки завершена",
      text:
        status === DealDuplicateReviewStatus.Duplicate
          ? `Сделка ${deal.deal_num} отмечена как дубль сделки ID ${deal.duplicate_of_deal_id}.`
          : `Сделка ${deal.deal_num} не является дублем сделки ID ${deal.duplicate_of_deal_id}.`,
      category: NotificationCategory.Deal,
      actions: [
        {
          label: "Открыть сделку",
          url: `/deals.management/${deal.id}`,
        },
      ],
    });

    return {
      message: `Статус проверки дубля сделки ${id} обновлён`,
      success: true,
    };
  }

  private async changeStatusNotify({ deal }) {
    if (!deal) {
      console.error('Deal is null in changeStatusNotify');
      return;
    }
    
    if (!deal.creator_id) {
      console.error('Deal creator_id is null', { dealId: deal.id });
      return;
    }
  
    await this.notificationService.send({
      user_id: deal.creator_id,
      title: "Статус сделки",
      text: `Обновлён статус Сделки №${deal.deal_num} - новый статус "${DealStatusRu[deal.status]}"`,
      email: 'partner@trinity.ru',
    });
  }
  
  private async specialDiscountNotify({ deal }) {
    if (!deal) {
      console.error('Deal is null in specialDiscountNotify');
      return;
    }
    
    if (!deal.creator_id) {
      console.error('Deal creator_id is null', { dealId: deal.id });
      return;
    }
  
    await this.notificationService.send({
      user_id: deal.creator_id,
      title: "Выдана скидка",
      text: `По сделке №${deal.deal_num} выдана скидка на ${deal.special_discount} ${deal.special_discount.indexOf("%") > -1 ? "процентов" : CURRENCY}`,
      email: 'partner@trinity.ru',
    });
  }
}
