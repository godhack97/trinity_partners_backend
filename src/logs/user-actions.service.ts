import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions } from "typeorm";
import { UserAction } from "./user-action.entity";

const DEDUPLICATED_BITRIX24_FAILURE_ACTIONS = new Set([
  "bitrix24_contact_notfound",
  "bitrix24_contact_creation_failed",
  "bitrix24_lead_sync_failed",
  "bitrix24_lead_sync_error",
  "bitrix24_lead_update_failed",
  "bitrix24_lead_conversion_failed",
  "bitrix24_lead_conversion_error",
  "bitrix24_lead_not_found",
]);

@Injectable()
export class UserActionsService {
  constructor(
    @InjectRepository(UserAction)
    private readonly userActionRepo: Repository<UserAction>,
  ) {}

  async log(user_id: number | null, action: string, details: object = {}) {
    // Повторяющиеся фоновые ошибки не должны засорять историю. Ручные
    // операторские действия и успешные события всегда сохраняются.
    if (DEDUPLICATED_BITRIX24_FAILURE_ACTIONS.has(action)) {
      const detailsJson = JSON.stringify(details);

      const existingLog = await this.userActionRepo
        .createQueryBuilder("action")
        .where("action.user_id = :user_id", { user_id })
        .andWhere("action.action = :action", { action })
        .andWhere("action.details = :details", { details: detailsJson })
        .getOne();

      if (existingLog) {
        return;
      }
    }

    const log = this.userActionRepo.create({ user_id, action, details });
    await this.userActionRepo.save(log);
  }

  async find(options?: FindManyOptions<UserAction>): Promise<UserAction[]> {
    return this.userActionRepo.find(options);
  }

  async findByUserId(user_id: number | null): Promise<UserAction[]> {
    return this.userActionRepo.find({ where: { user_id } });
  }

  async findByAction(action: string): Promise<UserAction[]> {
    return this.userActionRepo.find({ where: { action } });
  }

  async findByUserAndAction(
    user_id: number | null,
    action: string,
  ): Promise<UserAction[]> {
    return this.userActionRepo.find({ where: { user_id, action } });
  }
}
