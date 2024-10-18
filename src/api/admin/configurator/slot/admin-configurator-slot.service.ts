import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CnfSlotRepository } from "../../../../orm/repositories";

@Injectable()
export class AdminConfiguratorSlotService {
  constructor(private readonly cnfSlotRepository: CnfSlotRepository) {}

  async addSlot({ name }) {
    return await this.cnfSlotRepository.save({
      name
    });
  }

  async updateSlot(id: string, { name }) {
    const slot = await this.cnfSlotRepository.findOneBy({ id });

    if (!slot) throw new HttpException(`Слот ${id} не найдена`, HttpStatus.NOT_FOUND);

    return await this.cnfSlotRepository.update(id, {
      name
    });
  }

  async deleteSlot(id: string) {
    return await this.cnfSlotRepository.delete(id);
  }
}