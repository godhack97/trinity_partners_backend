import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
  CnfMultislotRepository, CnfMultislotSlotRepository, CnfServerMultislotRepository
} from "../../../../orm/repositories";
import { createUUID } from "../../../../utils/password";
import { CreateMultislotRequestDto } from "./dto/request/create-multislot.request.dto";
import { UpdateMultislotRequestDto } from "./dto/request/update-multislot.request.dto";

@Injectable()
export class AdminConfiguratorMultislotService {
  constructor(
    private readonly cnfMultislotRepository: CnfMultislotRepository,
    private readonly cnfMultislotSlotRepository: CnfMultislotSlotRepository
  ) {
  }

  async getMultislots() {
    return await this.multislotBuilder().getMany();
  }

  async createMultislot(data: CreateMultislotRequestDto) {
    const multislot = await this.cnfMultislotRepository.save({
      id: createUUID(),
      name: data.name
    });

    await this.cnfMultislotSlotRepository.save(data.slotIds.map(el => ({
      id: createUUID(),
      multislot_id: multislot.id,
      slot_id: el
    })));

    return await this.multislotBuilder().where("m.id = :id", { id: multislot.id }).getOne();
  }

  async updateMultislot(id: string, data: UpdateMultislotRequestDto) {
    const existsMultislot =  await this.cnfMultislotRepository.findOneBy({id});
    if(!existsMultislot) {
      throw new HttpException('Данного мультислота не существует', HttpStatus.NOT_FOUND);
    }

    await this.cnfMultislotSlotRepository.delete({ multislot_id: existsMultislot.id });

    const multislot = await this.cnfMultislotRepository.save({
      id: existsMultislot.id,
      name: data.name
    });

    if(data.multislot_slots && data.multislot_slots.length) {
      await this.cnfMultislotSlotRepository.save(data.multislot_slots.map(el => ({
        id: createUUID(),
        multislot_id: multislot.id,
        slot_id: el.slot_id
      })));
    }

    return await this.multislotBuilder().where("m.id = :id", { id: multislot.id }).getOne();
  }

  async deleteMultislot(id: string) {
    return await this.cnfMultislotRepository.delete(id)
  }

  multislotBuilder() {
    return this.cnfMultislotRepository.createQueryBuilder("m")
      .leftJoinAndMapMany(
        "m.multislot_slots",
        "cnf_multislot_slots",
        "cms",
        "m.id = cms.multislot_id"
      );
  }
}