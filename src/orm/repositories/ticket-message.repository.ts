import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TicketMessageEntity } from "@orm/entities/ticket-message.entity";
import { Repository } from "typeorm";

@Injectable()
export class TicketMessageRepository extends Repository<TicketMessageEntity> {
  constructor(
    @InjectRepository(TicketMessageEntity)
    private repo: Repository<TicketMessageEntity>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByTicketId(ticketId: number): Promise<TicketMessageEntity[]> {
    return await this.find({
      where: { ticket_id: ticketId },
      order: { id: "ASC" },
    });
  }
}
