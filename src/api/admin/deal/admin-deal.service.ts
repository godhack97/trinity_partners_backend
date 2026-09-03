import { NotificationService } from "@api/notification/notification.service";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DealStatus,
  DealStatusRu,
  UserEntity,
} from "@orm/entities";
import { UpdateAdminDealDto } from "./dto/request/update-deals.dto";
import { DealRepository } from "@orm/repositories";
import { CURRENCY } from "@config/constants";
import { DealService } from "@api/deal/deal.service";
import { RoleTypes } from "@app/types/RoleTypes";

@Injectable()
export class AdminDealService {
  constructor(
    private readonly dealRepository: DealRepository,
    private readonly notificationService: NotificationService,
    private readonly dealService: DealService,
  ) {}

  async update(
    id: number,
    updateDealDto: UpdateAdminDealDto,
    actor: UserEntity,
  ) {
    let deal = await this.dealRepository.findById(id);
    if (!deal) throw new NotFoundException();
    await this.assertCanModerateDeal(id, actor);
    const previousStatus = deal.status;
    this.assertAllowedStatusTransition(deal, updateDealDto.status);
    const registrationExpiresAt = this.validateRegistrationExpiresAt(
      previousStatus,
      updateDealDto.status,
      updateDealDto.registration_expires_at,
    );
    const finalDealSum = this.validateFinalDealSum(
      deal,
      updateDealDto.status,
      updateDealDto.final_deal_sum,
    );

    const hasSpecialTermsUpdate =
      updateDealDto.special_discount !== undefined ||
      updateDealDto.special_price !== undefined;
    const specialTerms = hasSpecialTermsUpdate
      ? this.resolveSpecialTerms(Number(deal.deal_sum), updateDealDto)
      : null;
    const patch: Record<string, unknown> = {
      status: updateDealDto.status,
    };
    if (registrationExpiresAt) {
      patch.registration_expires_at = registrationExpiresAt;
    }
    if (finalDealSum !== null) {
      patch.final_deal_sum = finalDealSum;
    }

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

    const updatedDeal = await this.dealRepository.update(
      { id, status: previousStatus },
      patch,
    );

    if (updatedDeal.affected === 0) {
      throw new HttpException(
        "Этап сделки уже был изменён другим пользователем",
        HttpStatus.CONFLICT,
      );
    }

    deal = await this.dealRepository.findById(id);

    if (previousStatus !== deal.status) {
      await this.changeStatusNotify({ deal });
    }

    if (
      previousStatus === DealStatus.Moderation &&
      deal.status === DealStatus.Registered
    ) {
      await this.dealService.notifyDistributorAboutApprovedDeal(deal);
    }

    if (specialTerms?.hasSpecialTerms) {
      await this.specialDiscountNotify({ deal });
    }

    return {
      message: `Сделка с id ${id} была успешно обновлена`,
      success: true,
    };
  }

  private async assertCanModerateDeal(id: number, actor: UserEntity) {
    const roleNames = new Set([
      actor.role?.name,
      ...(actor.roles || []).map((role) => role.name),
    ]);
    if (roleNames.has(RoleTypes.SuperAdmin)) return;

    if (!roleNames.has(RoleTypes.PartnerManager)) {
      throw new HttpException(
        "У вас недостаточно прав для модерации сделки",
        HttpStatus.FORBIDDEN,
      );
    }

    const deal = await this.dealService.findOne(id, actor);
    if (deal.responsible_manager_id !== actor.id) {
      throw new HttpException(
        "Модерировать сделку может только назначенный менеджер",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private resolveSpecialTerms(
    dealSum: number,
    updateDealDto: UpdateAdminDealDto,
  ) {
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

  private assertAllowedStatusTransition(deal: any, next: DealStatus) {
    // The admin form also uses this endpoint to update commercial terms. A
    // same-status PATCH is therefore a valid non-transition and must not send
    // another status notification.
    if (deal.status === next) return;

    const allowed: Partial<Record<DealStatus, DealStatus[]>> = {
      [DealStatus.Moderation]: [DealStatus.Registered, DealStatus.Canceled],
      [DealStatus.Registered]: [
        DealStatus.Moderation,
        DealStatus.Win,
        DealStatus.Lose,
      ],
      [DealStatus.Canceled]: [DealStatus.Moderation],
      [DealStatus.Win]: [DealStatus.Registered],
      [DealStatus.Lose]: [DealStatus.Registered],
    };
    if (!(allowed[deal.status] || []).includes(next)) {
      throw new BadRequestException(
        `Недопустимый переход этапа: ${deal.status} -> ${next}`,
      );
    }
  }

  private validateRegistrationExpiresAt(
    previousStatus: DealStatus,
    nextStatus: DealStatus,
    registrationExpiresAt?: Date | null,
  ): Date | null {
    if (nextStatus !== DealStatus.Registered) return null;

    if (!registrationExpiresAt && previousStatus !== DealStatus.Registered) {
      throw new BadRequestException("Укажите срок регистрации сделки");
    }

    if (!registrationExpiresAt) return null;

    const normalized = new Date(registrationExpiresAt);
    if (
      Number.isNaN(normalized.getTime()) ||
      normalized.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        "Срок регистрации сделки должен быть в будущем",
      );
    }

    return normalized;
  }

  private validateFinalDealSum(
    deal: any,
    nextStatus: DealStatus,
    finalDealSum?: number | null,
  ): number | null {
    if (finalDealSum !== undefined && finalDealSum !== null) {
      const normalized = Number(finalDealSum);
      if (!Number.isFinite(normalized) || normalized <= 0) {
        throw new BadRequestException(
          "Итоговая сумма сделки должна быть больше нуля",
        );
      }
      if (nextStatus !== DealStatus.Win) {
        throw new BadRequestException(
          "Итоговая сумма сделки указывается только при завершении сделки",
        );
      }
      return normalized;
    }

    if (nextStatus === DealStatus.Win) {
      const existingFinalDealSum = Number(deal.final_deal_sum);
      if (!Number.isFinite(existingFinalDealSum) || existingFinalDealSum <= 0) {
        throw new BadRequestException("Укажите итоговую сумму сделки");
      }
    }

    return null;
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
