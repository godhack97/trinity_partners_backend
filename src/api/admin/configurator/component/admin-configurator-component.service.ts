import { Injectable } from "@nestjs/common";
import { CnfComponentRepository } from "@orm/repositories";
import { CreateConfigurationComponentRequestDto } from "./dto/request/create-configurator-component.request.dto";
import { CnfComponentEntity, CnfComponentSlotEntity } from "@orm/entities";

@Injectable()
export class AdminConfiguratorComponentService {
  constructor(
    private readonly cnfComponentRepository: CnfComponentRepository,
  ) {}

  async createComponent(data: CreateConfigurationComponentRequestDto) {
    const component = CnfComponentEntity.init(data);
    return this.createOrUpdate(component, data);
  }

  async updateComponent(
    id: string,
    data: Partial<CreateConfigurationComponentRequestDto>,
  ) {
    const component = await this.cnfComponentRepository.findOneByOrFail({ id });
    component.update(data);
    return this.createOrUpdate(component, data);
  }
  async createOrUpdate(
    component: CnfComponentEntity,
    data: Partial<CreateConfigurationComponentRequestDto>,
  ) {
    if (data.slots?.length > 0) {
      component.slots = data.slots.map(
        (item: Partial<CnfComponentSlotEntity>) => {
          return CnfComponentSlotEntity.init(item);
        },
      );
    }
    await this.cnfComponentRepository.save(component);
    return await this.cnfComponentRepository.findOne({
      where: { id: component.id },
      relations: ["slots"],
    });
  }
  async deleteComponent(id: string) {
    return await this.cnfComponentRepository.delete(id);
  }
}
