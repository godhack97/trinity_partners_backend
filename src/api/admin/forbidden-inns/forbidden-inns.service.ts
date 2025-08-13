import { Injectable, NotFoundException } from "@nestjs/common";
import { ForbiddenInnRepository } from "src/orm/repositories/forbidden-inn.repository";
import {
  CreateForbiddenInnDto,
  UpdateForbiddenInnDto,
} from "./forbidden-inns.controller";

@Injectable()
export class ForbiddenInnService {
  constructor(
    private readonly forbiddenInnRepository: ForbiddenInnRepository,
  ) {}

  async findAll() {
    return await this.forbiddenInnRepository.find({
      order: { created_at: "DESC" },
    });
  }

  async findByInn(inn: string) {
    return await this.forbiddenInnRepository.findByInn(inn);
  }

  async create(createDto: CreateForbiddenInnDto) {
    return await this.forbiddenInnRepository.save({
      inn: createDto.inn,
      reason: createDto.reason,
    });
  }

  async update(id: number, updateDto: UpdateForbiddenInnDto) {
    const existingRecord = await this.forbiddenInnRepository.findOneBy({ id });

    if (!existingRecord) {
      throw new NotFoundException("Запись не найдена");
    }

    await this.forbiddenInnRepository.update(id, updateDto);
    return await this.forbiddenInnRepository.findOneBy({ id });
  }

  async remove(id: number) {
    const existingRecord = await this.forbiddenInnRepository.findOneBy({ id });

    if (!existingRecord) {
      throw new NotFoundException("Запись не найдена");
    }

    await this.forbiddenInnRepository.delete(id);
  }
}
