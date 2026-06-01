import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import {
  AddServerRequestDto,
  ServerMultislotDto,
  ServerSlotDto,
} from "./dto/request/add-server.request.dto";
import { UpsertPlatformProfileRequestDto } from "./dto/request/upsert-platform-profile.request.dto";
import {
  CnfServerRepository,
  CnfServerSlotRepository,
  CnfServerMultislotRepository,
  CnfServerGenerationRepository,
} from "@orm/repositories";
import {
  CnfPlatformBayEntity,
  CnfPlatformForbiddenComponentTypeEntity,
  CnfPlatformProfileEntity,
} from "@orm/entities";

@Injectable()
export class AdminConfiguratorServerService {
  constructor(
    private readonly cnfServerRepository: CnfServerRepository,
    private readonly cnfServerSlotRepository: CnfServerSlotRepository,
    private readonly cnfServerMultislotRepository: CnfServerMultislotRepository,
    private readonly cnfServerGenerationRepository: CnfServerGenerationRepository,
    private readonly dataSource: DataSource,
  ) {}

  async addServer(data: AddServerRequestDto) {
    const {
      name,
      description,
      serverbox_height_id,
      server_generation_id,
      price,
      slots,
      multislots,
      image,
      cert,
      guide,
      gisp = "",
      sort, // Добавляем sort
    } = data;

    const serverGeneration = await this.cnfServerGenerationRepository.findOneBy(
      { id: server_generation_id },
    );

    if (!serverGeneration) {
      throw new HttpException(
        "Данного поколения сервера не существует",
        HttpStatus.NOT_FOUND,
      );
    }

    const server = await this.cnfServerRepository.save({
      name,
      description,
      serverbox_height_id,
      server_generation_id,
      price,
      image,
      guide,
      cert,
      gisp,
      sort, // Добавляем sort
    });

    await this.updateSlots(server.id, slots);
    await this.updateMultiSlots(server.id, multislots);
    return await this.cnfServerRepository.findOneBy({ id: server.id });
  }

  async updateServer(id: string, data: AddServerRequestDto) {
    const {
      name,
      description,
      serverbox_height_id,
      server_generation_id,
      price,
      slots,
      multislots,
      image,
      cert,
      guide,
      gisp = "",
      sort, // Добавляем sort
    } = data;

    const existsServer = await this.cnfServerRepository.findOneBy({ id });

    if (!existsServer) {
      throw new HttpException("Cервер не найден", HttpStatus.NOT_FOUND);
    }

    const serverGeneration = await this.cnfServerGenerationRepository.findOneBy(
      { id: server_generation_id },
    );

    if (!serverGeneration) {
      throw new HttpException(
        "Данного поколения сервера не существует",
        HttpStatus.NOT_FOUND,
      );
    }

    await this.cnfServerSlotRepository.delete({ server_id: existsServer.id });
    await this.cnfServerMultislotRepository.delete({
      server_id: existsServer.id,
    });

    const server = await this.cnfServerRepository.save({
      id: existsServer.id,
      name,
      description,
      serverbox_height_id,
      server_generation_id,
      price,
      image,
      guide,
      cert,
      gisp,
      sort, // Добавляем sort
    });

    await this.updateSlots(server.id, slots);
    await this.updateMultiSlots(server.id, multislots);
    return await this.cnfServerRepository.findOneBy({ id: server.id });
  }

  async deleteServer(id: string) {
    return await this.cnfServerRepository.delete(id);
  }

  async getPlatformProfile(serverId: string) {
    const server = await this.cnfServerRepository.findOneBy({ id: serverId });

    if (!server) {
      throw new HttpException("Cервер не найден", HttpStatus.NOT_FOUND);
    }

    const profileRepo = this.dataSource.getRepository(CnfPlatformProfileEntity);
    const bayRepo = this.dataSource.getRepository(CnfPlatformBayEntity);
    const forbiddenRepo = this.dataSource.getRepository(
      CnfPlatformForbiddenComponentTypeEntity,
    );

    const profile = await profileRepo.findOne({ where: { server_id: serverId } });

    if (!profile) {
      return {
        server,
        profile: null,
        bays: [],
        forbidden_component_types: [],
      };
    }

    const [bays, forbiddenComponentTypes] = await Promise.all([
      bayRepo.find({ where: { platform_profile_id: profile.id } }),
      forbiddenRepo.find({ where: { platform_profile_id: profile.id } }),
    ]);

    return {
      server,
      profile,
      bays,
      forbidden_component_types: forbiddenComponentTypes,
    };
  }

  async upsertPlatformProfile(
    serverId: string,
    data: UpsertPlatformProfileRequestDto,
  ) {
    const server = await this.cnfServerRepository.findOneBy({ id: serverId });

    if (!server) {
      throw new HttpException("Cервер не найден", HttpStatus.NOT_FOUND);
    }

    const profileRepo = this.dataSource.getRepository(CnfPlatformProfileEntity);
    const bayRepo = this.dataSource.getRepository(CnfPlatformBayEntity);
    const forbiddenRepo = this.dataSource.getRepository(
      CnfPlatformForbiddenComponentTypeEntity,
    );

    let profile = await profileRepo.findOne({ where: { server_id: serverId } });

    profile = profileRepo.create({
      ...(profile || {}),
      server_id: serverId,
      platform_code: data.platform_code,
      family: data.family,
      mode: data.mode ?? "standard",
      cpu_limit: data.cpu_limit ?? 2,
      ram_type: data.ram_type,
      pcie_generation: data.pcie_generation ?? null,
      pcie_lanes_per_cpu: data.pcie_lanes_per_cpu ?? 80,
      pcie_lanes_total: data.pcie_lanes_total ?? 160,
      rear_pcie_ocp_limit: data.rear_pcie_ocp_limit ?? 96,
      pcie_slots: data.pcie_slots ?? 6,
      ocp_slots: data.ocp_slots ?? 1,
      base_power_w: data.base_power_w ?? 360,
      direct_sata_limit: data.direct_sata_limit ?? 0,
      internal_m2_bays: data.internal_m2_bays ?? 0,
      is_active: data.is_active ?? true,
    });

    const savedProfile = await profileRepo.save(profile);

    await bayRepo.delete({ platform_profile_id: savedProfile.id });
    await forbiddenRepo.delete({ platform_profile_id: savedProfile.id });

    if (data.bays?.length) {
      await bayRepo.save(
        data.bays.map((bay) =>
          bayRepo.create({
            platform_profile_id: savedProfile.id,
            placement: bay.placement,
            bay_kind: bay.bay_kind,
            form_factor: bay.form_factor,
            capacity: bay.capacity,
            allowed_drive_types: bay.allowed_drive_types,
            pcie_lanes_per_nvme: bay.pcie_lanes_per_nvme ?? null,
            counts_to_rear_pcie: bay.counts_to_rear_pcie ?? false,
          }),
        ),
      );
    }

    if (data.forbidden_component_types?.length) {
      await forbiddenRepo.save(
        data.forbidden_component_types.map((rule) =>
          forbiddenRepo.create({
            platform_profile_id: savedProfile.id,
            component_type_key: rule.component_type_key,
            reason: rule.reason ?? null,
          }),
        ),
      );
    }

    return this.getPlatformProfile(serverId);
  }

  private async updateSlots(id: string, slots?: ServerSlotDto[]) {
    if (slots?.length > 0) {
      await this.cnfServerSlotRepository.save(
        slots.map((el) => ({
          amount: el.amount,
          slot_id: el.slot_id,
          on_back_panel: el.on_back_panel,
          server_id: id,
        })),
      );
    }
  }

  private async updateMultiSlots(
    id: string,
    multislots?: ServerMultislotDto[],
  ) {
    if (multislots?.length > 0) {
      await this.cnfServerMultislotRepository.save(
        multislots.map((el) => ({
          amount: el.amount,
          multislot_id: el.multislot_id,
          on_back_panel: el.on_back_panel,
          server_id: id,
        })),
      );
    }
  }
}
