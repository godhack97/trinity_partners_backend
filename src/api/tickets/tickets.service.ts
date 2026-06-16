import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  TicketRepository,
  TicketMessageRepository,
  UserRepository,
} from "@orm/repositories";
import { TicketEntity, UserEntity } from "@orm/entities";
import { CreateTicketDto } from "./dto/request/create-ticket.dto";
import { AddTicketMessageDto } from "./dto/request/add-ticket-message.dto";
import { NotificationService } from "@api/notification/notification.service";
import { RoleTypes } from "@app/types/RoleTypes";

const MANAGER_ROLE = "partner_manager";

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketMessageRepository: TicketMessageRepository,
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository,
  ) {}

  private calcUnread(ticket: TicketEntity, userId: number): number {
    if (!ticket.messages) return 0;
    return ticket.messages.filter((m) => m.sender_id !== userId && !m.is_read).length;
  }

  private fillSenderNames(ticket: TicketEntity): void {
    ticket.messages?.forEach((msg) => {
      const info = (msg.sender as any)?.user_info;
      msg.sender_name = info
        ? [info.first_name, info.last_name].filter(Boolean).join(" ") || null
        : null;
    });
  }

  async findAll(auth_user: UserEntity) {
    let tickets: TicketEntity[];
    if (auth_user.role?.name === MANAGER_ROLE) {
      tickets = await this.ticketRepository.findByManagerId(auth_user.id);
    } else {
      tickets = await this.ticketRepository.findByCreatorId(auth_user.id);
    }
    tickets.forEach((t) => {
      t.unread_count = this.calcUnread(t, auth_user.id);
    });
    return tickets;
  }

  async findOne(id: number, auth_user: UserEntity) {
    const ticket = await this.ticketRepository.findById(id);

    if (!ticket) {
      throw new HttpException("Тикет не найден", HttpStatus.NOT_FOUND);
    }

    if (auth_user.role?.name === MANAGER_ROLE) {
      const tickets = await this.ticketRepository.findByManagerId(auth_user.id);
      const hasAccess = tickets.some((t) => t.id === ticket.id);
      if (!hasAccess) {
        throw new HttpException(
          "У вас нет доступа к этому тикету",
          HttpStatus.FORBIDDEN,
        );
      }
    } else if (ticket.creator_id !== auth_user.id) {
      throw new HttpException(
        "У вас нет доступа к этому тикету",
        HttpStatus.FORBIDDEN,
      );
    }

    this.fillSenderNames(ticket);
    ticket.unread_count = this.calcUnread(ticket, auth_user.id);
    return ticket;
  }

  async create(auth_user: UserEntity, dto: CreateTicketDto) {
    const assigneeId = await this.resolveAssigneeId(auth_user, dto.type);

    const ticket = await this.ticketRepository.save({
      creator_id: auth_user.id,
      assignee_id: assigneeId,
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
      is_read: false,
    });

    Logger.log(`[Tickets] create: auth_user.id=${auth_user.id} assignee_id=${assigneeId} type=${dto.type} role=${auth_user.role?.name}`);
    if (assigneeId) {
      try {
        await this.notificationService.send({
          user_id: assigneeId,
          title: "Новый запрос",
          text: `Партнёр создал новый запрос: «${dto.subject}»`,
          actions: [{ label: "Перейти к запросу", url: `/service?ticketId=${ticket.id}` }],
          ticket_id: ticket.id,
        });
        Logger.log(`[Tickets] notification sent to assignee ${assigneeId}`);
      } catch (e) {
        Logger.error(`[Tickets] notification error: ${e.message}`);
      }
    } else {
      Logger.warn(`[Tickets] assignee_id is null for user ${auth_user.id}, no notification sent`);
    }

    const result = await this.ticketRepository.findById(ticket.id);
    this.fillSenderNames(result);
    result.unread_count = this.calcUnread(result, auth_user.id);
    return result;
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
      is_read: false,
    });

    const isManager = auth_user.role?.name === MANAGER_ROLE;

    // Если отвечает менеджер и тикет ещё открыт → переводим в "в работе"
    if (isManager && ticket.status === "open") {
      await this.ticketRepository.update(ticket.id, { status: "in_progress" });
    }

    const updatedTicket = await this.ticketRepository.findById(ticket.id);

    if (isManager) {
      // Уведомление партнёру: менеджер ответил
      await this.notificationService.send({
        user_id: ticket.creator_id,
        title: "Ответ на запрос",
        text: `Вам ответили на запрос: «${ticket.subject}»`,
        actions: [{ label: "Перейти к запросу", url: `/service?ticketId=${ticket.id}` }],
        ticket_id: ticket.id,
      });
    } else {
      const assigneeId = ticket.assignee_id || auth_user.manager_id;
      if (assigneeId) {
        await this.notificationService.send({
          user_id: assigneeId,
          title: "Новое сообщение в запросе",
          text: `Новое сообщение в запросе: «${ticket.subject}»`,
          actions: [{ label: "Перейти к запросу", url: `/service?ticketId=${ticket.id}` }],
          ticket_id: ticket.id,
        });
      }
    }

    this.fillSenderNames(updatedTicket);
    updatedTicket.unread_count = this.calcUnread(updatedTicket, auth_user.id);
    return updatedTicket;
  }

  async markAsRead(ticketId: number, auth_user: UserEntity) {
    await this.findOne(ticketId, auth_user); // проверка доступа
    await this.ticketMessageRepository.markAsReadByReceiver(ticketId, auth_user.id);
    const ticket = await this.ticketRepository.findById(ticketId);
    this.fillSenderNames(ticket);
    ticket.unread_count = 0;
    return ticket;
  }

  async close(ticketId: number, auth_user: UserEntity) {
    if (auth_user.role?.name !== MANAGER_ROLE) {
      throw new HttpException(
        "Только менеджер может закрывать тикеты",
        HttpStatus.FORBIDDEN,
      );
    }

    const ticket = await this.findOne(ticketId, auth_user);

    if (ticket.status === "closed") {
      throw new HttpException("Тикет уже закрыт", HttpStatus.BAD_REQUEST);
    }

    await this.ticketRepository.update(ticket.id, { status: "closed" });

    // Уведомление партнёру: тикет закрыт
    await this.notificationService.send({
      user_id: ticket.creator_id,
      title: "Запрос закрыт",
      text: `Запрос «${ticket.subject}» отправлен в архив`,
      actions: [{ label: "Перейти к запросу", url: `/service?ticketId=${ticket.id}` }],
      ticket_id: ticket.id,
    });

    const result = await this.ticketRepository.findById(ticket.id);
    this.fillSenderNames(result);
    result.unread_count = this.calcUnread(result, auth_user.id);
    return result;
  }

  async reopen(ticketId: number, auth_user: UserEntity) {
    if (auth_user.role?.name !== MANAGER_ROLE) {
      throw new HttpException(
        "Только менеджер может возвращать тикеты в работу",
        HttpStatus.FORBIDDEN,
      );
    }

    const ticket = await this.findOne(ticketId, auth_user);

    if (ticket.status !== "closed") {
      throw new HttpException("Тикет не закрыт", HttpStatus.BAD_REQUEST);
    }

    await this.ticketRepository.update(ticket.id, { status: "in_progress" });

    // Уведомление партнёру: тикет возвращён в работу
    await this.notificationService.send({
      user_id: ticket.creator_id,
      title: "Запрос возобновлён",
      text: `Запрос «${ticket.subject}» возвращён в работу`,
      actions: [{ label: "Перейти к запросу", url: `/service?ticketId=${ticket.id}` }],
      ticket_id: ticket.id,
    });

    const result = await this.ticketRepository.findById(ticket.id);
    this.fillSenderNames(result);
    result.unread_count = this.calcUnread(result, auth_user.id);
    return result;
  }

  async getCount(auth_user: UserEntity): Promise<number> {
    if (auth_user.role?.name === MANAGER_ROLE) {
      return this.ticketRepository.countByManagerId(auth_user.id);
    }
    return this.ticketRepository.count({
      where: { creator_id: auth_user.id },
    });
  }

  private async resolveAssigneeId(
    auth_user: UserEntity,
    type: "manager" | "tech_specialist",
  ) {
    if (type === "manager") {
      return auth_user.manager_id || null;
    }

    const techSpecialist = await this.userRepository
      .createQueryBuilder("u")
      .leftJoin("user_roles", "ur", "u.id = ur.user_id")
      .leftJoin("roles", "r", "ur.role_id = r.id")
      .leftJoin("roles", "primary_role", "u.role_id = primary_role.id")
      .where("r.name = :roleName OR primary_role.name = :roleName", {
        roleName: RoleTypes.TechnicalSpecialist,
      })
      .orderBy("u.id", "ASC")
      .getOne();

    return techSpecialist?.id || auth_user.manager_id || null;
  }
}
