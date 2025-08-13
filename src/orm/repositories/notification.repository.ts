import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { NotificationEntity } from "@orm/entities/notification.entity";
import { Repository } from "typeorm";

@Injectable()
export class NotificationRepository extends Repository<NotificationEntity> {
  constructor(
    @InjectRepository(NotificationEntity)
    private repo: Repository<NotificationEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findAll() {
    return await this.find();
  }

  public async findById(id: number) {
    return await this.findOneBy({ id });
  }
}
