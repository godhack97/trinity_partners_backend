import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEntity } from "@orm/entities";
import { MoreThanOrEqual, Repository } from "typeorm";

@Injectable()
export class EventRepository extends Repository<EventEntity> {
  constructor(
    @InjectRepository(EventEntity)
    private repo: Repository<EventEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  public async findById(id: number) {
    return await this.findOneBy({ id });
  }

  public async findUpcoming(limit: number) {
    return await this.find({
      where: {
        is_active: true,
        date: MoreThanOrEqual(new Date()),
      },
      order: { date: "ASC" },
      take: limit,
    });
  }
}
