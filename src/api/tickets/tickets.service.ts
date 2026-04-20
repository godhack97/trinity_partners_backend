import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { TicketRepository, TicketMessageRepository } from "@orm/repositories";
import { UserEntity } from "@orm/entities";
import { CreateTicketDto } from "./dto/request/create-ticket.dto";
import { AddTicketMessageDto } from "./dto/request/add-ticket-message.dto";

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketMessageRepository: TicketMessageRepository,
  ) {}

  async findAll(auth_user: UserEntity) {
    return this.ticketRepository.findByCreatorId(auth_user.id);
  }

  async findOne(id: number, auth_user: UserEntity) {
    const ticket = await this.ticketRepository.findById(id);

    if (!ticket) {
      throw new HttpException("Тикет не найден", HttpStatus.NOT_FOUND);
    }

    if (ticket.creator_id !== auth_user.id) {
      throw new HttpException(
        "У вас нет доступа к этому тикету",
        HttpStatus.FORBIDDEN,
      );
    }

    return ticket;
  }

  async create(auth_user: UserEntity, dto: CreateTicketDto) {
    const ticket = await this.ticketRepository.save({
      creator_id: auth_user.id,
      type: dto.type,
      subject: dto.subject,
      status: "open" as const,
      configuration_id: dto.configurationId,
    });

    await this.ticketMessageRepository.save({
      ticket_id: ticket.id,
      sender_id: auth_user.id,
      message: dto.message,
      attachments: dto.attachments || [],
    });

    return this.ticketRepository.findById(ticket.id);
  }

  async addMessage(
    ticketId: number,
    auth_user: UserEntity,
    dto: AddTicketMessageDto,
  ) {
    const ticket = await this.findOne(ticketId, auth_user);

    await this.ticketMessageRepository.save({
      ticket_id: ticket.id,
      sender_id: auth_user.id,
      message: dto.message,
      attachments: dto.attachments || [],
    });

    return this.ticketRepository.findById(ticket.id);
  }

  async getCount(auth_user: UserEntity): Promise<number> {
    return this.ticketRepository.count({
      where: { creator_id: auth_user.id },
    });
  }
}
