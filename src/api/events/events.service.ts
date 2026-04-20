import { Injectable, NotFoundException } from "@nestjs/common";
import { EventRepository } from "@orm/repositories";
import { CreateEventDto } from "./dto/request/create-event.dto";

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

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
    return this.eventRepository.save({
      title: dto.title,
      description: dto.description,
      date: new Date(dto.date),
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      link: dto.link,
      type: dto.type || "webinar",
      image: dto.image,
    });
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
}
