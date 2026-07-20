import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import {
  AddServerRequestDto,
  SaveServerWithProfileRequestDto,
  ServerMultislotDto,
  ServerSlotDto,
} from "./dto/request/add-server.request.dto";
import { UpsertPlatformProfileRequestDto } from "./dto/request/upsert-platform-profile.request.dto";
import {
  CnfPlatformBayEntity,
  CnfPlatformForbiddenComponentTypeEntity,
  CnfPlatformProfileEntity,
  CnfServerEntity,
  CnfServerGeneration,
  CnfServerMultislotEntity,
  CnfServerSlotEntity,
} from "@orm/entities";

@Injectable()
export class AdminConfiguratorServerService {
  constructor(private readonly dataSource: DataSource) {}

  async addServer(data: SaveServerWithProfileRequestDto) {
    return this.dataSource.transaction(async (manager) => {
      const { profile, ...serverData } = data;

      await this.ensureServerGenerationExists(
        manager,
        serverData.server_generation_id,
      );

      const serverRepo = manager.getRepository(CnfServerEntity);
      const server = await serverRepo.save(
        serverRepo.create(this.getServerValues(serverData)),
      );

      await this.replaceServerSlots(
        manager,
        server.id,
        serverData.slots,
        serverData.multislots,
      );
      await this.savePlatformProfile(manager, server.id, profile);

      return this.getServerWithProfile(manager, server.id);
    });
  }

  async updateServer(id: string, data: SaveServerWithProfileRequestDto) {
    return this.dataSource.transaction(async (manager) => {
      const serverRepo = manager.getRepository(CnfServerEntity);
      const existingServer = await serverRepo.findOneBy({ id });

      if (!existingServer) {
        throw new HttpException("Cервер не найден", HttpStatus.NOT_FOUND);
      }

      const { profile, ...serverData } = data;
      await this.ensureServerGenerationExists(
        manager,
        serverData.server_generation_id,
      );

      const server = await serverRepo.save(
        serverRepo.merge(existingServer, this.getServerValues(serverData)),
      );

      await this.replaceServerSlots(
        manager,
        server.id,
        serverData.slots,
        serverData.multislots,
      );
      await this.savePlatformProfile(manager, server.id, profile);

      return this.getServerWithProfile(manager, server.id);
    });
  }

  async deleteServer(id: string) {
    return this.dataSource.getRepository(CnfServerEntity).delete(id);
  }

  async getPlatformProfile(serverId: string) {
    return this.getServerWithProfile(this.dataSource.manager, serverId);
  }

  async upsertPlatformProfile(
    serverId: string,
    data: UpsertPlatformProfileRequestDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const server = await manager
        .getRepository(CnfServerEntity)
        .findOneBy({ id: serverId });

      if (!server) {
        throw new HttpException("Cервер не найден", HttpStatus.NOT_FOUND);
      }

      await this.savePlatformProfile(manager, serverId, data);
      return this.getServerWithProfile(manager, serverId);
    });
  }

  private getServerValues(data: AddServerRequestDto) {
    return {
      name: data.name,
      description: data.description,
      serverbox_height_id: data.serverbox_height_id,
      server_generation_id: data.server_generation_id,
      price: data.price,
      image: data.image,
      guide: data.guide,
      cert: data.cert,
      gisp: data.gisp ?? "",
      sort: data.sort ?? 100,
    };
  }

  private async ensureServerGenerationExists(
    manager: EntityManager,
    serverGenerationId: string,
  ) {
    const serverGeneration = await manager
      .getRepository(CnfServerGeneration)
      .findOneBy({ id: serverGenerationId });

    if (!serverGeneration) {
      throw new HttpException(
        "Данного поколения сервера не существует",
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async replaceServerSlots(
    manager: EntityManager,
    serverId: string,
    slots: ServerSlotDto[] = [],
    multislots: ServerMultislotDto[] = [],
  ) {
    const slotRepo = manager.getRepository(CnfServerSlotEntity);
    const multislotRepo = manager.getRepository(CnfServerMultislotEntity);

    await slotRepo.delete({ server_id: serverId });
    await multislotRepo.delete({ server_id: serverId });

    if (slots.length) {
      await slotRepo.save(
        slots.map((slot) =>
          slotRepo.create({
            server_id: serverId,
            slot_id: slot.slot_id,
            amount: slot.amount,
            on_back_panel: slot.on_back_panel ?? false,
          }),
        ),
      );
    }

    if (multislots.length) {
      await multislotRepo.save(
        multislots.map((multislot) =>
          multislotRepo.create({
            server_id: serverId,
            multislot_id: multislot.multislot_id,
            amount: multislot.amount,
            on_back_panel: multislot.on_back_panel ?? false,
          }),
        ),
      );
    }
  }

  private async savePlatformProfile(
    manager: EntityManager,
    serverId: string,
    data: UpsertPlatformProfileRequestDto,
  ) {
    const profileRepo = manager.getRepository(CnfPlatformProfileEntity);
    const bayRepo = manager.getRepository(CnfPlatformBayEntity);
    const forbiddenRepo = manager.getRepository(
      CnfPlatformForbiddenComponentTypeEntity,
    );

    const existingProfile = await profileRepo.findOne({
      where: { server_id: serverId },
    });
    const profile = profileRepo.create({
      ...(existingProfile || {}),
      server_id: serverId,
      platform_code: data.platform_code,
      family: data.family,
      mode: data.mode ?? "standard",
      cpu_limit: data.cpu_limit ?? 2,
      ram_type: data.ram_type,
      pcie_generation: data.pcie_generation || null,
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

    return savedProfile;
  }

  private async getServerWithProfile(
    manager: EntityManager,
    serverId: string,
  ) {
    const server = await manager.getRepository(CnfServerEntity).findOne({
      where: { id: serverId },
    });

    if (!server) {
      throw new HttpException("Cервер не найден", HttpStatus.NOT_FOUND);
    }

    const profile = await manager
      .getRepository(CnfPlatformProfileEntity)
      .findOne({ where: { server_id: serverId } });

    if (!profile) {
      return {
        server,
        profile: null,
        bays: [],
        forbidden_component_types: [],
      };
    }

    const bays = await manager.getRepository(CnfPlatformBayEntity).find({
      where: { platform_profile_id: profile.id },
    });
    const forbiddenComponentTypes = await manager
      .getRepository(CnfPlatformForbiddenComponentTypeEntity)
      .find({
        where: { platform_profile_id: profile.id },
      });

    return {
      server,
      profile,
      bays,
      forbidden_component_types: forbiddenComponentTypes,
    };
  }
}
