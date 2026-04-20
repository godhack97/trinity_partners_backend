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
    return await this.findOne({
      where: { id },
      relations: ["messages"],
    });
  }

  async findByCreatorId(creatorId: number): Promise<TicketEntity[]> {
    return await this.find({
      where: { creator_id: creatorId },
      order: { id: "DESC" },
    });
  }
}
