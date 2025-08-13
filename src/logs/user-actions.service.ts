import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindManyOptions } from "typeorm";
import { UserAction } from "./user-action.entity";

@Injectable()
export class UserActionsService {
  constructor(
    @InjectRepository(UserAction)
    private readonly userActionRepo: Repository<UserAction>,
  ) {}

  async log(user_id: number | null, action: string, details: object = {}) {
    // у б24 бывает часто повторяющаяся ошибка, проверка нужна чтобы не засирать логи.
    if (action.includes("bitrix24")) {
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
