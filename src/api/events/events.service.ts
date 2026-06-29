import { NotificationService } from "@api/notification/notification.service";
import { Cron } from "@nestjs/schedule";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEntity, NotificationCategory } from "@orm/entities";
import { EventRepository, UserRepository } from "@orm/repositories";
import { CreateEventDto } from "./dto/request/create-event.dto";

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll(upcoming?: boolean, limit?: number) {
    if (upcoming) {
      return this.eventRepository.findUpcoming(limit || 50);
    }

    const qb = this.eventRepository
      .createQueryBuilder("e")
      .where("e.is_active = :active", { active: true })
      .orderBy("e.date", "ASC");

    if (limit) {
      qb.take(limit);
    }

    return qb.getMany();
  }

  async findOne(id: number) {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException("Мероприятие не найдено");
    }
    return event;
  }

  async getCount() {
    return this.eventRepository.count({ where: { is_active: true } });
  }

  async create(dto: CreateEventDto) {
    const event = await this.eventRepository.save({
      title: dto.title,
      description: dto.description,
      date: new Date(dto.date),
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      link: dto.link,
      type: dto.type || "webinar",
      image: dto.image,
    });

    return event;
  }

  async update(id: number, dto: Partial<CreateEventDto>) {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException("Мероприятие не найдено");
    }

    const updateData: any = { ...dto };
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.end_date) updateData.end_date = new Date(dto.end_date);

    await this.eventRepository.update(id, updateData);
    return this.eventRepository.findById(id);
  }

  async remove(id: number) {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException("Мероприятие не найдено");
    }
    await this.eventRepository.softDelete(id);
  }

  @Cron("0 * * * *")
  async sendEventReminders() {
    return;
  }

  private async sendReminderForDays(daysBefore: 3 | 1) {
    const marker =
      daysBefore === 3 ? "reminder_3_days_sent_at" : "reminder_1_day_sent_at";
    const target = new Date();
    target.setDate(target.getDate() + daysBefore);

    const start = new Date(target);
    start.setHours(0, 0, 0, 0);

    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const events = await this.eventRepository
      .createQueryBuilder("e")
      .where("e.is_active = :active", { active: true })
      .andWhere("e.date BETWEEN :start AND :end", { start, end })
      .andWhere(`e.${marker} IS NULL`)
      .getMany();

    for (const event of events) {
      await this.notifyEventAudience(
        event,
        `Напоминание о мероприятии через ${daysBefore} ${this.getDaysLabel(daysBefore)}`,
        `Мероприятие «${event.title}» начнётся ${this.formatEventDate(event.date)}.`,
      );
      await this.eventRepository.update(event.id, {
        [marker]: new Date(),
      });
    }
  }

  private async notifyEventAudience(
    event: EventEntity,
    title: string,
    textPrefix: string,
  ) {
    const users = await this.userRepository.find({
      where: { email_confirmed: true },
    });
    const text = `${textPrefix}: «${event.title}». Дата: ${this.formatEventDate(event.date)}.`;
    const url = event.link || "/events";

    for (const user of users) {
      try {
        await this.notificationService.sendWeb({
          user_id: user.id,
          title,
          text,
          type: "site",
          category: NotificationCategory.Education,
          actions: [
            {
              label: "Подробнее",
              url,
            },
          ],
        });

        await this.notificationService.sendEmail({
          user_id: user.id,
          email: user.email,
          title,
          text: `${text} ${event.link ? `<br><a href="${event.link}">${event.link}</a>` : ""}`,
        });
      } catch (error) {
        this.logger.error(
          `Не удалось отправить уведомление о мероприятии ${event.id} пользователю ${user.id}`,
          error,
        );
      }
    }
  }

  private formatEventDate(date: Date) {
    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private getDaysLabel(days: number) {
    return days === 1 ? "день" : "дня";
  }
}
