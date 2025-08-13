import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CnfSlotRepository } from "@orm/repositories";
import { CreateSlotRequestDto } from "@api/admin/configurator/slot/dto/request/create-slot.request.dto";

@Injectable()
export class AdminConfiguratorSlotService {
  constructor(private readonly cnfSlotRepository: CnfSlotRepository) {}

  async create(data: CreateSlotRequestDto) {
    return await this.cnfSlotRepository.save(data);
  }

  async updateSlot(id: string, data: Partial<CreateSlotRequestDto>) {
    const slot = await this.cnfSlotRepository.findOneBy({ id });

    if (!slot)
      throw new HttpException(`Слот ${id} не найдена`, HttpStatus.NOT_FOUND);

    return await this.cnfSlotRepository.update(id, data);
  }

  async deleteSlot(id: string) {
    try {
      return await this.cnfSlotRepository.delete(id);
    } catch {
      throw new HttpException(
        `К слоту привязаны компоненты, удаление невозможно`,
        HttpStatus.CONFLICT,
      );
    }
  }
}
