import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { AddServerRequestDto, ServerMultislotDto, ServerSlotDto } from "./dto/request/add-server.request.dto";
import { CnfServerRepository, CnfServerSlotRepository, CnfServerMultislotRepository, CnfServerGenerationRepository } from "@orm/repositories";



@Injectable()
export class AdminConfiguratorServerService {
  constructor(
    private readonly cnfServerRepository: CnfServerRepository,
    private readonly cnfServerSlotRepository: CnfServerSlotRepository,
    private readonly cnfServerMultislotRepository: CnfServerMultislotRepository,
    private readonly cnfServerGenerationRepository: CnfServerGenerationRepository
    ) {}

  async addServer(data: AddServerRequestDto) {
    const { name, description, serverbox_height_id, server_generation_id, price, slots, multislots, image, cert, guide } = data;
    const serverGeneration = await this.cnfServerGenerationRepository.findOneBy({id: server_generation_id});
    
    if(!serverGeneration) {
      throw new HttpException('Данного поколения сервера не существует', HttpStatus.NOT_FOUND);
    }

    const server = await this.cnfServerRepository.save({
      name,
      description,
      serverbox_height_id,
      server_generation_id,
      price,
      image,
      guide,
      cert
    });
    await this.updateSlots(server.id, slots);
    await this.updateMultiSlots(server.id, multislots);
    return await this.cnfServerRepository.findOneBy({ id: server.id});
  }


  async updateServer(id: string, data: AddServerRequestDto) {
   
    const { name, description, serverbox_height_id, server_generation_id, price, slots, multislots, image, cert, guide } = data;

    const existsServer = await this.cnfServerRepository.findOneBy({id});

    if(!existsServer) {
      throw new HttpException('Cервер не найден', HttpStatus.NOT_FOUND);
    }

    const serverGeneration = await this.cnfServerGenerationRepository.findOneBy({id: server_generation_id});
    
    if(!serverGeneration) {
      throw new HttpException('Данного поколения сервера не существует', HttpStatus.NOT_FOUND);
    }

    await this.cnfServerSlotRepository.delete({server_id: existsServer.id});

    await this.cnfServerMultislotRepository.delete({server_id: existsServer.id})

    const server = await this.cnfServerRepository.save({
      id: existsServer.id,
      name,
      description,
      serverbox_height_id,
      server_generation_id,
      price,
      image,
      guide,
      cert
    });
    await this.updateSlots(server.id, slots);
    await this.updateMultiSlots(server.id, multislots);
    return await this.cnfServerRepository.findOneBy({ id: server.id});
  }


  async deleteServer(id: string) {
    return await this.cnfServerRepository.delete(id);
  }

  private async updateSlots(id: string, slots?: ServerSlotDto[]) {
    if (slots?.length > 0) {
      await this.cnfServerSlotRepository.save(slots.map(el => {
        return {
          amount: el.amount,
          slot_id: el.slot_id,
          on_back_panel: el.on_back_panel,
          server_id: id
        };
      }));
    }
  }

  private async updateMultiSlots(id: string, multislots?: ServerMultislotDto[]) {
    if (multislots?.length > 0) {
      await this.cnfServerMultislotRepository.save(multislots.map(el => {
        return {
          amount: el.amount,
          multislot_id: el.multislot_id,
          on_back_panel: el.on_back_panel,
          server_id: id
        };
      }));
    }
  }
}