import { Injectable } from "@nestjs/common";
import { AddServerRequestDto } from "./dto/request/add-server.request.dto";

import {
  CnfServerMultislotRepository,
  CnfServerRepository,
  CnfServerSlotRepository
} from "../../../../orm/repositories";

@Injectable()
export class AdminConfiguratorServerService {
  constructor(
    private readonly cnfServerRepository: CnfServerRepository,
    private readonly cnfServerSlotRepository: CnfServerSlotRepository,
    private readonly cnfServerMultislotRepository: CnfServerMultislotRepository,
    ) {}
  async addServer(data: AddServerRequestDto) {
    const { name, serverbox_height_id, price, slots, multislots } = data;
    const server = await this.cnfServerRepository.save({
      name,
      serverbox_height_id,
      price
    });
    if (slots?.length > 0) {
      await this.cnfServerSlotRepository.save(slots.map((el => {
        return {
          amount: el.amount,
          slot_id: el.slot_id,
          on_back_panel: el.on_back_panel,
          server_id: server.id
        };
      })));
    }
    if (multislots?.length > 0) {
      await this.cnfServerMultislotRepository.save(multislots.map((el => {
        return {
          amount: el.amount,
          multislot_id: el.multislot_id,
          on_back_panel: el.on_back_panel,
          server_id: server.id
        };
      })));
    }
    return await this.cnfServerRepository.findOneBy({ id: server.id});
  }

  async deleteServer(id: string) {
    return await this.cnfServerRepository.delete(id);
  }
}