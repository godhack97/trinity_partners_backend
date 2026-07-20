import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TicketEntity } from "@orm/entities/ticket.entity";
import { Repository } from "typeorm";

@Injectable()
export class TicketRepository extends Repository<TicketEntity> {
  constructor(
    @InjectRepository(TicketEntity)
    private repo: Repository<TicketEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findById(id: number): Promise<TicketEntity | null> {
    return await this.createQueryBuilder("t")
      .leftJoinAndSelect("t.messages", "m")
      .leftJoinAndSelect("m.sender", "s")
      .leftJoinAndSelect("s.user_info", "si")
      .where("t.id = :id", { id })
      .orderBy("m.id", "ASC")
      .getOne();
  }

  async findByCreatorId(creatorId: number): Promise<TicketEntity[]> {
    return await this.find({
      where: { creator_id: creatorId },
      order: { id: "DESC" },
    });
  }

  async findByHandlerId(handlerId: number): Promise<TicketEntity[]> {
    return await this.createQueryBuilder("t")
      .leftJoin("users", "u", "u.id = t.creator_id")
      .where("t.assignee_id = :handlerId", { handlerId })
      .orWhere("(t.assignee_id IS NULL AND u.manager_id = :handlerId)", {
        handlerId,
      })
      .leftJoinAndSelect("t.messages", "m")
      .orderBy("t.id", "DESC")
      .getMany();
  }

  async countByHandlerId(handlerId: number): Promise<number> {
    return await this.createQueryBuilder("t")
      .leftJoin("users", "u", "u.id = t.creator_id")
      .where("t.assignee_id = :handlerId", { handlerId })
      .orWhere("(t.assignee_id IS NULL AND u.manager_id = :handlerId)", {
        handlerId,
      })
      .getCount();
  }
}
