import { NotificationService } from "@api/notification/notification.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DealDuplicateReviewStatus,
  DealStatus,
  DealStatusRu,
  NotificationCategory,
  UserEntity,
} from "@orm/entities";
import { UpdateDealDto } from "./dto/request/update-deals.dto";
import { DealRepository } from "@orm/repositories";
import { CURRENCY } from "@config/constants";
import { DealService } from "@api/deal/deal.service";
import { RoleTypes } from "@app/types/RoleTypes";
import { ReviewDealDuplicateDto } from "./dto/request/review-deal-duplicate.dto";

@Injectable()
export class AdminDealService {
  constructor(
    private readonly dealRepository: DealRepository,
    private readonly notificationService: NotificationService,
    private readonly dealService: DealService,
  ) {}

  async update(
    id: number,
    updateDealDto: UpdateDealDto,
    actor: UserEntity,
  ) {
    let deal = await this.dealRepository.findById(id);
    if (!deal) throw new NotFoundException();
    await this.assertCanModerateDeal(id, actor);
    const previousStatus = deal.status;
    this.assertAllowedStatusTransition(deal, updateDealDto.status);

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
      previousStatus !== deal.status &&
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

  private assertAllowedStatusTransition(deal: any, next: DealStatus) {
    // The admin form also uses this endpoint to update commercial terms. A
    // same-status PATCH is therefore a valid non-transition and must not send
    // another status notification.
    if (deal.status === next) return;

    const allowed: Partial<Record<DealStatus, DealStatus[]>> = {
      [DealStatus.Moderation]: [DealStatus.Registered, DealStatus.Canceled],
      [DealStatus.Registered]: [DealStatus.Win, DealStatus.Lose],
    };
    if (!(allowed[deal.status] || []).includes(next)) {
      throw new BadRequestException(
        `Недопустимый переход этапа: ${deal.status} -> ${next}`,
      );
    }
    if (
      next === DealStatus.Registered &&
      deal.duplicate_review_status === DealDuplicateReviewStatus.Pending
    ) {
      throw new ConflictException(
        "Завершите ручную проверку совпадения ИНН до регистрации сделки",
      );
    }
  }

  async reviewDuplicate(
    id: number,
    reviewDto: ReviewDealDuplicateDto,
    actor: UserEntity,
  ) {
    const deal = await this.dealRepository.findById(id);
    if (!deal) throw new NotFoundException();

    const isSuperAdmin = this.assertCanReviewDuplicate(deal, actor);

    if (deal.duplicate_of_deal_id == null) {
      throw new BadRequestException(
        "У сделки нет связанной похожей сделки",
      );
    }

    if (
      deal.duplicate_review_status !== DealDuplicateReviewStatus.Pending
    ) {
      throw new ConflictException(
        "Ручная проверка дубля уже завершена или не ожидает решения",
      );
    }

    const reviewedAt = new Date();
    const updateCriteria = {
      id,
      duplicate_of_deal_id: deal.duplicate_of_deal_id,
      duplicate_review_status: DealDuplicateReviewStatus.Pending,
      ...(!isSuperAdmin ? { responsible_manager_id: actor.id } : {}),
    };

    const updatedDeal = await this.dealRepository.update(updateCriteria, {
      duplicate_review_status: reviewDto.status,
      duplicate_reviewed_by_user_id: actor.id,
      duplicate_reviewed_at: reviewedAt,
      duplicate_review_comment: reviewDto.comment?.trim() || null,
    });

    if (updatedDeal.affected !== 1) {
      throw new ConflictException(
        "Решение не сохранено: проверка уже завершена или ответственный менеджер изменён",
      );
    }

    try {
      await this.notificationService.send({
        user_id: deal.creator_id,
        title: "Проверка похожей сделки завершена",
        text:
          reviewDto.status === DealDuplicateReviewStatus.Duplicate
            ? `Сделка ${deal.deal_num} отмечена как дубль сделки ID ${deal.duplicate_of_deal_id}.`
            : `Сделка ${deal.deal_num} не является дублем сделки ID ${deal.duplicate_of_deal_id}.`,
        category: NotificationCategory.Deal,
        delivery_key: `deal-duplicate:${deal.id}:${deal.creator_id}:reviewed`,
        webOnly: true,
        actions: [
          {
            label: "Открыть сделку",
            url: `/deals.management/${deal.id}`,
          },
        ],
      });
    } catch (error) {
      // The decision is already committed and remains visible in the pending
      // queue/audit fields even if a best-effort notification is unavailable.
      console.error("Не удалось отправить результат проверки дубля", {
        dealId: deal.id,
        error,
      });
    }

    return {
      message: `Статус проверки дубля сделки ${id} обновлён`,
      success: true,
    };
  }

  async getDuplicateReviewContext(id: number, actor: UserEntity) {
    const deal = await this.dealRepository.findById(id);
    if (!deal) throw new NotFoundException();
    this.assertCanReviewDuplicate(deal, actor);

    if (deal.duplicate_of_deal_id == null) {
      throw new BadRequestException(
        "У сделки нет связанной похожей сделки",
      );
    }

    const canonicalDeal = await this.dealRepository.findById(
      deal.duplicate_of_deal_id,
    );
    if (!canonicalDeal) {
      throw new NotFoundException("Похожая сделка не найдена");
    }

    const normalizedInn = deal.customer?.inn_normalized;
    const matches = normalizedInn
      ? await this.dealRepository.findDuplicateCandidatesByNormalizedInn(
          normalizedInn,
        )
      : [canonicalDeal, deal];

    return {
      current: this.toDuplicateReviewSummary(deal),
      canonical: this.toDuplicateReviewSummary(canonicalDeal),
      matches: matches.map((match) =>
        this.toDuplicateReviewSummary(match),
      ),
      match_count: matches.length,
    };
  }

  private assertCanReviewDuplicate(deal: any, actor: UserEntity) {
    const actorRoles = this.getRoleNames(actor);
    const isSuperAdmin = actorRoles.has(RoleTypes.SuperAdmin);
    const isAssignedPartnerManager =
      actorRoles.has(RoleTypes.PartnerManager) &&
      deal.responsible_manager_id === actor.id;

    if (!isSuperAdmin && !isAssignedPartnerManager) {
      throw new ForbiddenException(
        "Проверять дубль может только назначенный ответственный менеджер",
      );
    }

    return isSuperAdmin;
  }

  private toDuplicateReviewSummary(deal: any) {
    return {
      id: deal.id,
      deal_num: deal.deal_num,
      title: deal.title || null,
      status: deal.status,
      created_at: deal.created_at || null,
      creator_id: deal.creator_id,
      customer_company_name: deal.customer?.company_name || null,
      customer_inn: deal.customer?.inn || null,
      distributor_name:
        deal.distributor_company?.name || deal.distributor?.name || null,
      integrator_name:
        deal.integrator_company?.name || deal.integrator_name || null,
    };
  }

  private getRoleNames(actor: UserEntity) {
    return new Set([
      actor.role?.name,
      ...(actor.roles || []).map((role) => role.name),
    ]);
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
