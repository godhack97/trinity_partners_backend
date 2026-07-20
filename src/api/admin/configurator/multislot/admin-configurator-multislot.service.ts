import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
  CnfMultislotRepository,
} from "../../../../orm/repositories";
import {
  CnfMultislotEntity,
  CnfMultislotSlotEntity,
  CnfServerMultislotEntity,
  CnfSlotEntity,
} from "@orm/entities";
import { DataSource, EntityManager } from "typeorm";
import { createUUID } from "../../../../utils/password";
import { CreateMultislotRequestDto } from "./dto/request/create-multislot.request.dto";
import { UpdateMultislotRequestDto } from "./dto/request/update-multislot.request.dto";

@Injectable()
export class AdminConfiguratorMultislotService {
  constructor(
    private readonly cnfMultislotRepository: CnfMultislotRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getMultislots() {
    return await this.multislotBuilder().getMany();
  }

  async createMultislot(data: CreateMultislotRequestDto) {
    return this.dataSource.transaction(async (manager) => {
      await this.validateSlots(manager, data);
      const repo = manager.getRepository(CnfMultislotEntity);
      const multislot = await repo.save(repo.create({
        id: createUUID(),
        name: data.name.trim(),
      }));
      await this.replaceSlots(manager, multislot.id, data.multislot_slots);
      return this.getMultislotAggregate(manager, multislot.id);
    });
  }

  async updateMultislot(id: string, data: UpdateMultislotRequestDto) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CnfMultislotEntity);
      const existsMultislot = await repo.findOneBy({ id });
      if (!existsMultislot) {
        throw new HttpException(
          "Данного мультислота не существует",
          HttpStatus.NOT_FOUND,
        );
      }

      await this.validateSlots(manager, data);
      const multislot = await repo.save(
        repo.merge(existsMultislot, { name: data.name.trim() }),
      );
      await this.replaceSlots(manager, multislot.id, data.multislot_slots);
      return this.getMultislotAggregate(manager, multislot.id);
    });
  }

  private async validateSlots(
    manager: EntityManager,
    data: CreateMultislotRequestDto,
  ) {
    const requestedIds = data.multislot_slots.map((slot) => slot.slot_id);
    if (!requestedIds.length || new Set(requestedIds).size !== requestedIds.length) {
      throw new HttpException(
        "Мультислот должен содержать уникальные слоты",
        HttpStatus.BAD_REQUEST,
      );
    }
    const slots = await manager.getRepository(CnfSlotEntity).find();
    const existingIds = new Set(slots.map((slot) => slot.id));
    const missingIds = requestedIds.filter((id) => !existingIds.has(id));
    if (missingIds.length) {
      throw new HttpException(
        `Слоты не найдены: ${missingIds.join(", ")}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async replaceSlots(
    manager: EntityManager,
    multislotId: string,
    slots: CreateMultislotRequestDto["multislot_slots"],
  ) {
    const repo = manager.getRepository(CnfMultislotSlotEntity);
    await repo.delete({ multislot_id: multislotId });
    await repo.save(
      slots.map((slot) => repo.create({
        id: createUUID(),
        multislot_id: multislotId,
        slot_id: slot.slot_id,
      })),
    );
  }

  private async getMultislotAggregate(
    manager: EntityManager,
    multislotId: string,
  ) {
    const [multislot, multislotSlots] = await Promise.all([
      manager.getRepository(CnfMultislotEntity).findOneBy({ id: multislotId }),
      manager.getRepository(CnfMultislotSlotEntity).find({
        where: { multislot_id: multislotId },
      }),
    ]);
    return { ...multislot, multislot_slots: multislotSlots };
  }

  async deleteMultislot(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const multislotRepo = manager.getRepository(CnfMultislotEntity);
      const multislot = await multislotRepo.findOneBy({ id });
      if (!multislot) {
        throw new HttpException(
          "Данного мультислота не существует",
          HttpStatus.NOT_FOUND,
        );
      }
      const usages = await manager.getRepository(CnfServerMultislotEntity).find({
        where: { multislot_id: id },
      });
      if (usages.length) {
        throw new HttpException(
          "Мультислот используется в конфигурации сервера",
          HttpStatus.CONFLICT,
        );
      }
      await manager
        .getRepository(CnfMultislotSlotEntity)
        .delete({ multislot_id: id });
      await multislotRepo.delete({ id });
      return { success: true };
    });
  }

  multislotBuilder() {
    return this.cnfMultislotRepository
      .createQueryBuilder("m")
      .leftJoinAndMapMany(
        "m.multislot_slots",
        "cnf_multislot_slots",
        "cms",
        "m.id = cms.multislot_id",
      );
  }
}
