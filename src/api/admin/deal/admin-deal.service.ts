import { NotificationService } from "@api/notification/notification.service";
import {
  BadRequestException,
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

    const hasSpecialTermsUpdate =
      updateDealDto.special_discount !== undefined ||
      updateDealDto.special_price !== undefined;
    const specialTerms = hasSpecialTermsUpdate
      ? this.resolveSpecialTerms(Number(deal.deal_sum), updateDealDto)
      : null;
    const patch: Record<string, unknown> = {
      status: updateDealDto.status,
    };

    if (specialTerms) {
      patch.special_discount = specialTerms.special_discount;
      patch.special_price = specialTerms.special_price;
      patch.discount_date = specialTerms.hasSpecialTerms
        ? updateDealDto.discount_date === undefined
          ? deal.discount_date
          : updateDealDto.discount_date
        : null;
    } else if (updateDealDto.discount_date !== undefined) {
      patch.discount_date = updateDealDto.discount_date;
    }

    const updatedDeal = await this.dealRepository.update(id, patch);

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Не удалось обновить сделку",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    deal = await this.dealRepository.findById(id);

    await this.changeStatusNotify({ deal });

    if (specialTerms?.hasSpecialTerms) {
      await this.specialDiscountNotify({ deal });
    }

    return {
      message: `Сделка с id ${id} была успешно обновлена`,
      success: true,
    };
  }

  private resolveSpecialTerms(dealSum: number, updateDealDto: UpdateDealDto) {
    const discount = updateDealDto.special_discount?.trim() || null;
    const hasExplicitPrice =
      updateDealDto.special_price !== undefined &&
      updateDealDto.special_price !== null;
    const explicitPrice = hasExplicitPrice
      ? Number(updateDealDto.special_price)
      : null;

    let calculatedPrice: number | null = null;

    if (discount) {
      const percentMatch = discount.match(/^(\d+(?:[.,]\d{1,2})?)%$/);
      const amountMatch = discount.match(/^\d+(?:[.,]\d{1,2})?$/);

      if (!percentMatch && !amountMatch) {
        throw new BadRequestException(
          "Скидка должна быть суммой или процентом, например 15000 или 10%",
        );
      }

      const value = Number((percentMatch?.[1] || discount).replace(",", "."));
      if (percentMatch && value > 100) {
        throw new BadRequestException("Процент скидки не может превышать 100%");
      }
      if (!percentMatch && value > dealSum) {
        throw new BadRequestException("Скидка не может превышать сумму сделки");
      }

      calculatedPrice = percentMatch
        ? dealSum - (dealSum * value) / 100
        : dealSum - value;
      calculatedPrice = this.roundMoney(calculatedPrice);
    }

    if (hasExplicitPrice) {
      if (!Number.isFinite(explicitPrice) || explicitPrice < 0 || explicitPrice > dealSum) {
        throw new BadRequestException(
          "Специальная цена должна быть от 0 до суммы сделки",
        );
      }

      const roundedPrice = this.roundMoney(explicitPrice);
      if (
        calculatedPrice !== null &&
        Math.abs(calculatedPrice - roundedPrice) > 0.01
      ) {
        throw new BadRequestException(
          "Специальная цена не соответствует указанной скидке",
        );
      }
      calculatedPrice = roundedPrice;
    }

    return {
      special_discount: discount,
      special_price: calculatedPrice,
      hasSpecialTerms: discount !== null || calculatedPrice !== null,
    };
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  async reviewDuplicate(
    id: number,
    status:
      | DealDuplicateReviewStatus.Duplicate
      | DealDuplicateReviewStatus.NotDuplicate,
  ) {
    const deal = await this.dealRepository.findById(id);
    if (!deal) throw new NotFoundException();

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
  
    const specialTermsText = deal.special_discount
      ? `скидка ${deal.special_discount}${deal.special_discount.includes("%") ? "" : ` ${CURRENCY}`}`
      : `специальная цена ${deal.special_price} ${CURRENCY}`;

    await this.notificationService.send({
      user_id: deal.creator_id,
      title: "Выдана скидка",
      text: `По сделке №${deal.deal_num} установлена ${specialTermsText}`,
      email: 'partner@trinity.ru',
    });
  }
}
