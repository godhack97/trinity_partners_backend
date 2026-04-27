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

  async markAsReadByReceiver(ticketId: number, readerId: number): Promise<void> {
    await this.createQueryBuilder()
      .update()
      .set({ is_read: true })
      .where("ticket_id = :ticketId AND sender_id != :readerId AND is_read = false", {
        ticketId,
        readerId,
      })
      .execute();
  }
}
