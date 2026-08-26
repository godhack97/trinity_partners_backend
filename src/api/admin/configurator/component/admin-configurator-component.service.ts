import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CnfComponentRepository, CnfComponentTypeRepository, CnfSlotRepository } from "@orm/repositories";
import {
  SaveConfigurationComponentRequestDto,
} from "./dto/request/create-configurator-component.request.dto";
import { UpdateConfigurationComponentRequestDto } from "./dto/request/update-configurator-component.request.dto";
import { CnfComponentEntity, CnfComponentSlotEntity } from "@orm/entities";
import * as entities from "src/orm/entities";
import { UpsertComponentProfilesRequestDto } from "./dto/request/upsert-component-profiles.request.dto";
import {
  COMPONENT_PROFILE_NAMES,
  ComponentProfileMetadata,
  ComponentProfileName,
  getComponentProfileErrors,
  resolveComponentProfileMetadata,
  SPECIALIZED_COMPONENT_PROFILE_NAMES,
} from "@api/configurator/component-profile-kind";
import {
  CONFIGURATOR_COMPONENT_BACKUP_FIELDS,
  CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
  CONFIGURATOR_COMPONENT_SLOT_BACKUP_FIELDS,
} from "./configurator-component-schema";

type ComponentProfilesAggregate = ComponentProfileMetadata &
  Record<ComponentProfileName, any | null> & {
    component: CnfComponentEntity;
    profile_errors: string[];
  };

interface ExcelRow {
  [key: string]: any;
  ID?: string;
  'Название': string;
  'Подтип': string;
  'Цена': number;
  'Тип компонента'?: string;
  'Поколение сервера'?: string;
  'Поколение процессора'?: string;
  'Слот[1]'?: string;
  'Количество[1]'?: number;
  'Увеличение[1]'?: boolean;
  'Слот[2]'?: string;
  'Количество[2]'?: number;
  'Увеличение[2]'?: boolean;
  'Слот[3]'?: string;
  'Количество[3]'?: number;
  'Увеличение[3]'?: boolean;
  'Слот[4]'?: string;
  'Количество[4]'?: number;
  'Увеличение[4]'?: boolean;
  'Слот[5]'?: string;
  'Количество[5]'?: number;
  'Увеличение[5]'?: boolean;
}

interface ComponentBackupSnapshot {
  schema_version: number;
  created_at: string;
  references: {
    component_types: Array<{
      id: string;
      name: string;
      move_selected_to_top?: boolean;
    }>;
    slots: Array<{ id: string; name: string }>;
    multislots: Array<{ id: string; name: string }>;
    multislot_slots: Array<{
      id: string;
      multislot_id: string;
      slot_id: string;
    }>;
    server_generations: Array<{ id: string; name: string }>;
    processor_generations: Array<{ id: string; name: string }>;
  };
  components: Array<{
    component: Record<string, any>;
    slots: Array<Record<string, any>>;
    profiles: Record<ComponentProfileName, Record<string, any> | null>;
  }>;
}

interface ValidatedExcelComponent {
  row_number: number;
  id?: string;
  action: "upsert" | "delete";
  changed: boolean;
  payload?: SaveConfigurationComponentRequestDto;
}

export interface ComponentImportReport {
  schema_version: number;
  dry_run: boolean;
  total_rows: number;
  valid_rows: number;
  added: number;
  updated: number;
  unchanged: number;
  deleted: number;
  added_ids: string[];
  updated_ids: string[];
  deleted_ids: string[];
  errors: string[];
  backup_id: string | null;
}

const PROFILE_EXCEL_COLUMNS = {
  catalog: {
    component_type_key: "profile.catalog.component_type_key",
    part_number: "profile.catalog.part_number",
    vendor: "profile.catalog.vendor",
    client_display_mode: "profile.catalog.client_display_mode",
    generation_key: "profile.catalog.generation_key",
    server_generation_id: "profile.catalog.server_generation_id",
    processor_generation_id: "profile.catalog.processor_generation_id",
    is_active: "profile.catalog.is_active",
    disabled_reason: "profile.catalog.disabled_reason",
    warning_text: "profile.catalog.warning_text",
    warning_color: "profile.catalog.warning_color",
    s4b_status: "profile.catalog.s4b_status",
  },
  resource: {
    resource_kind: "profile.resource.resource_kind",
    pcie_lanes: "profile.resource.pcie_lanes",
    rear_pcie_lanes: "profile.resource.rear_pcie_lanes",
    physical_slots: "profile.resource.physical_slots",
    ocp_slots: "profile.resource.ocp_slots",
    internal_ports: "profile.resource.internal_ports",
    power_w: "profile.resource.power_w",
    uses_power: "profile.resource.uses_power",
  },
  price: {
    base_price: "profile.price.base_price",
    currency: "profile.price.currency",
    coefficient: "profile.price.coefficient",
    price_mode: "profile.price.price_mode",
    price_required: "profile.price.price_required",
  },
  cpu: {
    socket_profile: "profile.cpu.socket_profile",
    ram_type: "profile.cpu.ram_type",
    tdp_w: "profile.cpu.tdp_w",
    memory_channels: "profile.cpu.memory_channels",
    max_ram_modules_per_cpu: "profile.cpu.max_ram_modules_per_cpu",
    max_ram_gb_per_cpu: "profile.cpu.max_ram_gb_per_cpu",
    memory_speed_1dpc: "profile.cpu.memory_speed_1dpc",
    memory_speed_2dpc: "profile.cpu.memory_speed_2dpc",
  },
  ram: {
    ram_type: "profile.ram.ram_type",
    capacity_gb: "profile.ram.capacity_gb",
    frequency_mhz: "profile.ram.frequency_mhz",
    rank: "profile.ram.rank",
    form_factor: "profile.ram.form_factor",
  },
  drive: {
    drive_type: "profile.drive.drive_type",
    interface_type: "profile.drive.interface_type",
    m2_interface: "profile.drive.m2_interface",
    media_kind: "profile.drive.media_kind",
    form_factor: "profile.drive.form_factor",
    capacity_gb: "profile.drive.capacity_gb",
    speed_class: "profile.drive.speed_class",
    workload_class: "profile.drive.workload_class",
    pcie_lanes: "profile.drive.pcie_lanes",
    power_w: "profile.drive.power_w",
  },
  controller: {
    controller_type: "profile.controller.controller_type",
    pcie_lanes: "profile.controller.pcie_lanes",
    rear_pcie_lanes: "profile.controller.rear_pcie_lanes",
    physical_slots: "profile.controller.physical_slots",
    internal_ports: "profile.controller.internal_ports",
    m2_slot_count: "profile.controller.m2_slot_count",
    m2_drive_type: "profile.controller.m2_drive_type",
    supports_sata: "profile.controller.supports_sata",
    supports_sas: "profile.controller.supports_sas",
    supports_nvme: "profile.controller.supports_nvme",
    power_w: "profile.controller.power_w",
  },
  network: {
    network_kind: "profile.network.network_kind",
    port_type: "profile.network.port_type",
    connector_type: "profile.network.connector_type",
    port_speed: "profile.network.port_speed",
    port_speed_gbps: "profile.network.port_speed_gbps",
    ports_count: "profile.network.ports_count",
    port_count: "profile.network.port_count",
    supported_media: "profile.network.supported_media",
    pcie_lanes: "profile.network.pcie_lanes",
    rear_pcie_lanes: "profile.network.rear_pcie_lanes",
    physical_slots: "profile.network.physical_slots",
    ocp_slots: "profile.network.ocp_slots",
    power_w: "profile.network.power_w",
  },
  gpu: {
    pcie_lanes: "profile.gpu.pcie_lanes",
    rear_pcie_lanes: "profile.gpu.rear_pcie_lanes",
    physical_slots: "profile.gpu.physical_slots",
    memory_gb: "profile.gpu.memory_gb",
    power_w: "profile.gpu.power_w",
  },
  transceiver: {
    interface_type: "profile.transceiver.interface_type",
    connector_type: "profile.transceiver.connector_type",
    speed: "profile.transceiver.speed",
    speed_gbps: "profile.transceiver.speed_gbps",
    media_type: "profile.transceiver.media_type",
    wavelength: "profile.transceiver.wavelength",
    wavelength_or_length: "profile.transceiver.wavelength_or_length",
    compatible_port_type: "profile.transceiver.compatible_port_type",
  },
  psu: {
    power_w: "profile.psu.power_w",
    efficiency_class: "profile.psu.efficiency_class",
  },
  service: {
    service_level: "profile.service.service_level",
    years: "profile.service.years",
    formula: "profile.service.formula",
    percent: "profile.service.percent",
    fixed_price: "profile.service.fixed_price",
  },
};

const PROFILE_NUMBER_FIELDS = new Set([
  "pcie_lanes",
  "rear_pcie_lanes",
  "physical_slots",
  "ocp_slots",
  "internal_ports",
  "power_w",
  "base_price",
  "coefficient",
  "tdp_w",
  "memory_channels",
  "max_ram_modules_per_cpu",
  "max_ram_gb_per_cpu",
  "memory_speed_1dpc",
  "memory_speed_2dpc",
  "capacity_gb",
  "frequency_mhz",
  "ports_count",
  "port_count",
  "port_speed_gbps",
  "speed_gbps",
  "years",
  "percent",
  "fixed_price",
  "m2_slot_count",
  "memory_gb",
]);

const PROFILE_BOOLEAN_FIELDS = new Set([
  "is_active",
  "uses_power",
  "price_required",
  "supports_sata",
  "supports_sas",
  "supports_nvme",
]);

const PROFILE_ENTITIES: Record<ComponentProfileName, any> = {
  catalog: entities.CnfComponentCatalogProfileEntity,
  resource: entities.CnfComponentResourceProfileEntity,
  price: entities.CnfComponentPriceProfileEntity,
  cpu: entities.CnfCpuProfileEntity,
  ram: entities.CnfRamProfileEntity,
  drive: entities.CnfDriveProfileEntity,
  controller: entities.CnfControllerProfileEntity,
  network: entities.CnfNetworkProfileEntity,
  gpu: entities.CnfGpuProfileEntity,
  transceiver: entities.CnfTransceiverProfileEntity,
  psu: entities.CnfPsuProfileEntity,
  service: entities.CnfServiceProfileEntity,
};

const PROFILE_BACKUP_FIELDS = Object.fromEntries(
  COMPONENT_PROFILE_NAMES.map((profileName) => [
    profileName,
    [
      "id",
      "component_id",
      ...Object.keys(PROFILE_EXCEL_COLUMNS[profileName]),
      "created_at",
      "updated_at",
    ],
  ]),
) as Record<ComponentProfileName, string[]>;

@Injectable()
export class AdminConfiguratorComponentService {
  constructor(
    private readonly cnfComponentRepository: CnfComponentRepository,
    private readonly cnfComponentTypeRepository: CnfComponentTypeRepository,
    private readonly cnfSlotRepository: CnfSlotRepository,
    @InjectRepository(entities.CnfProcessorGeneration)
    private readonly cnfProcessorGenerationRepo: Repository<entities.CnfProcessorGeneration>,
    @InjectRepository(entities.CnfServerGeneration)
    private readonly cnfServerGenerationRepo: Repository<entities.CnfServerGeneration>,
    @InjectRepository(entities.CnfComponentBackup)
    private cnfComponentBackupRepository: Repository<entities.CnfComponentBackup>,
    @InjectRepository(entities.CnfComponentBackupData)
    private cnfComponentBackupDataRepository: Repository<entities.CnfComponentBackupData>,
    private readonly dataSource: DataSource,

  ) {}

  async getComponentFormOptions() {
    const optionColumns = {
      client_display_modes: ["cnf_component_catalog_profiles", "client_display_mode"],
      currencies: ["cnf_component_price_profiles", "currency"],
      price_coefficients: ["cnf_component_price_profiles", "coefficient"],
      price_modes: ["cnf_component_price_profiles", "price_mode"],
      cpu_socket_profiles: ["cnf_cpu_profiles", "socket_profile"],
      ram_types: ["cnf_ram_profiles", "ram_type"],
      ram_form_factors: ["cnf_ram_profiles", "form_factor"],
      drive_types: ["cnf_drive_profiles", "drive_type"],
      drive_interfaces: ["cnf_drive_profiles", "interface_type"],
      drive_m2_interfaces: ["cnf_drive_profiles", "m2_interface"],
      drive_media_kinds: ["cnf_drive_profiles", "media_kind"],
      drive_form_factors: ["cnf_drive_profiles", "form_factor"],
      drive_speed_classes: ["cnf_drive_profiles", "speed_class"],
      drive_workload_classes: ["cnf_drive_profiles", "workload_class"],
      controller_types: ["cnf_controller_profiles", "controller_type"],
      controller_m2_drive_types: ["cnf_controller_profiles", "m2_drive_type"],
      network_kinds: ["cnf_network_profiles", "network_kind"],
      network_port_types: ["cnf_network_profiles", "port_type"],
      network_connector_types: ["cnf_network_profiles", "connector_type"],
      network_port_speeds: ["cnf_network_profiles", "port_speed"],
      network_port_speeds_gbps: ["cnf_network_profiles", "port_speed_gbps"],
      network_supported_media: ["cnf_network_profiles", "supported_media"],
      transceiver_interface_types: ["cnf_transceiver_profiles", "interface_type"],
      transceiver_connector_types: ["cnf_transceiver_profiles", "connector_type"],
      transceiver_speeds: ["cnf_transceiver_profiles", "speed"],
      transceiver_speeds_gbps: ["cnf_transceiver_profiles", "speed_gbps"],
      transceiver_media_types: ["cnf_transceiver_profiles", "media_type"],
      transceiver_compatible_port_types: ["cnf_transceiver_profiles", "compatible_port_type"],
      psu_efficiency_classes: ["cnf_psu_profiles", "efficiency_class"],
      service_levels: ["cnf_service_profiles", "service_level"],
      service_years: ["cnf_service_profiles", "years"],
      service_formulas: ["cnf_service_profiles", "formula"],
    } as const;

    const query = Object.entries(optionColumns)
      .map(([key, [table, column]]) => `
        SELECT '${key}' AS option_key, CAST(\`${column}\` AS CHAR) AS value
          FROM \`${table}\`
         WHERE \`${column}\` IS NOT NULL
           AND TRIM(CAST(\`${column}\` AS CHAR)) <> ''
      `)
      .join(" UNION ");
    const rows = await this.dataSource.query(
      `${query} ORDER BY option_key, value`,
    );
    const result = Object.fromEntries(
      Object.keys(optionColumns).map((key) => [key, []]),
    ) as Record<string, string[]>;

    rows.forEach((row: any) => result[row.option_key].push(row.value));
    return result;
  }

  async getComponentProfiles(
    componentId: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ComponentProfilesAggregate> {
    const component = await manager.getRepository(CnfComponentEntity).findOne({
      where: { id: componentId },
      relations: ["slots"],
    });

    if (!component) {
      throw new HttpException("Компонент не найден", HttpStatus.NOT_FOUND);
    }

    const profiles = {} as Record<ComponentProfileName, any | null>;
    for (const profileName of COMPONENT_PROFILE_NAMES) {
      profiles[profileName] = await this.findComponentProfile(
        manager,
        PROFILE_ENTITIES[profileName],
        componentId,
      );
    }
    const metadata = resolveComponentProfileMetadata(component, profiles);

    return {
      component,
      ...profiles,
      ...metadata,
      profile_errors: getComponentProfileErrors(metadata, profiles),
    };
  }

  async upsertComponentProfiles(
    componentId: string,
    data: UpsertComponentProfilesRequestDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const component = await manager
        .getRepository(CnfComponentEntity)
        .findOneBy({ id: componentId });

      if (!component) {
        throw new HttpException("Компонент не найден", HttpStatus.NOT_FOUND);
      }

      await this.applyComponentProfiles(manager, component, data);
      return this.getComponentProfiles(componentId, manager);
    });
  }

  private async findComponentProfile(
    manager: EntityManager,
    entity: any,
    componentId: string,
  ) {
    return manager.getRepository(entity).findOne({
      where: { component_id: componentId },
    });
  }

  private async applyComponentProfiles(
    manager: EntityManager,
    component: CnfComponentEntity,
    data: UpsertComponentProfilesRequestDto,
  ) {
    const profileData = data as Record<string, any>;
    const metadata = resolveComponentProfileMetadata(component, profileData);

    for (const profileName of COMPONENT_PROFILE_NAMES) {
      const repo = manager.getRepository(PROFILE_ENTITIES[profileName]);
      const requestedProfile = profileData[profileName];
      const isIncompatibleSpecializedProfile =
        SPECIALIZED_COMPONENT_PROFILE_NAMES.includes(profileName as any) &&
        profileName !== metadata.profile_kind;

      if (isIncompatibleSpecializedProfile || requestedProfile === null) {
        await repo.delete({ component_id: component.id });
        continue;
      }

      if (requestedProfile === undefined) {
        continue;
      }

      const existing = await repo.findOne({
        where: { component_id: component.id },
      });
      const normalizedProfile = this.normalizeProfileForComponent(
        profileName,
        requestedProfile,
        metadata,
      );

      await repo.save(
        repo.create({
          ...(existing || {}),
          ...normalizedProfile,
          component_id: component.id,
        }),
      );
    }
  }

  private normalizeProfileForComponent(
    profileName: ComponentProfileName,
    profile: Record<string, any>,
    metadata: ReturnType<typeof resolveComponentProfileMetadata>,
  ) {
    if (profileName === "catalog") {
      return {
        ...profile,
        component_type_key: metadata.component_type_key,
      };
    }
    if (profileName === "resource") {
      return { ...profile, resource_kind: metadata.resource_kind };
    }
    if (profileName === "controller" && metadata.controller_type) {
      return { ...profile, controller_type: metadata.controller_type };
    }
    if (profileName === "network" && metadata.network_kind) {
      return { ...profile, network_kind: metadata.network_kind };
    }

    return profile;
  }

  async createBackup(name: string, createdBy?: string) {
    return this.dataSource.transaction((manager) =>
      this.createBackupWithManager(manager, name, createdBy),
    );
  }

  private async createBackupWithManager(
    manager: EntityManager,
    name: string,
    createdBy?: string,
  ) {
    const snapshot = await this.buildBackupSnapshot(manager);
    await this.validateBackupSnapshot(manager, snapshot);
    const backupRepo = manager.getRepository(entities.CnfComponentBackup);
    const backupDataRepo = manager.getRepository(
      entities.CnfComponentBackupData,
    );
    const backup = await backupRepo.save(
      backupRepo.create({
        name: name.trim(),
        created_by: createdBy,
        components_count: snapshot.components.length,
      }),
    );
    await backupDataRepo.save(
      backupDataRepo.create({
        backup_id: backup.id,
        component_data: snapshot,
      }),
    );

    return {
      id: backup.id,
      name: backup.name,
      created_at: backup.created_at,
      components_count: backup.components_count,
      schema_version: snapshot.schema_version,
      profiles_count: snapshot.components.reduce(
        (count, item) =>
          count + Object.values(item.profiles).filter(Boolean).length,
        0,
      ),
    };
  }

  private async buildBackupSnapshot(
    manager: EntityManager,
  ): Promise<ComponentBackupSnapshot> {
    const [
      components,
      componentTypes,
      slots,
      multislots,
      multislotSlots,
      serverGenerations,
      processorGenerations,
      ...profileCollections
    ] = await Promise.all([
      manager.getRepository(CnfComponentEntity).find({ relations: ["slots"] }),
      manager.getRepository(entities.CnfComponentTypeEntity).find(),
      manager.getRepository(entities.CnfSlotEntity).find(),
      manager.getRepository(entities.CnfMultislotEntity).find(),
      manager.getRepository(entities.CnfMultislotSlotEntity).find(),
      manager.getRepository(entities.CnfServerGeneration).find(),
      manager.getRepository(entities.CnfProcessorGeneration).find(),
      ...COMPONENT_PROFILE_NAMES.map((profileName) =>
        manager.getRepository(PROFILE_ENTITIES[profileName]).find(),
      ),
    ]);
    const profilesByName = Object.fromEntries(
      COMPONENT_PROFILE_NAMES.map((profileName, index) => [
        profileName,
        new Map(
          (profileCollections[index] as any[]).map((profile) => [
            profile.component_id,
            profile,
          ]),
        ),
      ]),
    ) as Record<ComponentProfileName, Map<string, any>>;

    return {
      schema_version: CONFIGURATOR_COMPONENT_SCHEMA_VERSION,
      created_at: new Date().toISOString(),
      references: {
        component_types: componentTypes.map((item: any) => ({
          id: item.id,
          name: item.name,
          move_selected_to_top: item.move_selected_to_top,
        })),
        slots: slots.map((item: any) => ({ id: item.id, name: item.name })),
        multislots: multislots.map((item: any) => ({
          id: item.id,
          name: item.name,
        })),
        multislot_slots: multislotSlots.map((item: any) => ({
          id: item.id,
          multislot_id: item.multislot_id,
          slot_id: item.slot_id,
        })),
        server_generations: serverGenerations.map((item: any) => ({
          id: item.id,
          name: item.name,
        })),
        processor_generations: processorGenerations.map((item: any) => ({
          id: item.id,
          name: item.name,
        })),
      },
      components: components
        .map((component: any) => ({
          component: this.pickBackupFields(
            component,
            CONFIGURATOR_COMPONENT_BACKUP_FIELDS,
          ),
          slots: (component.slots || [])
            .map((slot: any) =>
              this.pickBackupFields(
                slot,
                CONFIGURATOR_COMPONENT_SLOT_BACKUP_FIELDS,
              ),
            )
            .sort((a, b) => `${a.id}`.localeCompare(`${b.id}`)),
          profiles: Object.fromEntries(
            COMPONENT_PROFILE_NAMES.map((profileName) => {
              const profile = profilesByName[profileName].get(component.id);
              return [
                profileName,
                profile
                  ? this.pickBackupFields(
                      profile,
                      PROFILE_BACKUP_FIELDS[profileName],
                    )
                  : null,
              ];
            }),
          ) as Record<
            ComponentProfileName,
            Record<string, any> | null
          >,
        }))
        .sort((a, b) => `${a.component.id}`.localeCompare(`${b.component.id}`)),
    };
  }

  private pickBackupFields(source: any, fields: readonly string[]) {
    return Object.fromEntries(
      fields
        .filter((field) => source?.[field] !== undefined)
        .map((field) => [field, source[field]]),
    );
  }

  async getBackups() {
    const [backups, backupData] = await Promise.all([
      this.cnfComponentBackupRepository.find({
        order: { created_at: "DESC" },
      }),
      this.cnfComponentBackupDataRepository.find(),
    ]);
    const dataByBackupId = new Map(
      backupData.map((item) => [item.backup_id, item.component_data]),
    );

    return backups.map((backup) => ({
      id: backup.id,
      name: backup.name,
      created_at: backup.created_at,
      components_count: backup.components_count,
      schema_version:
        dataByBackupId.get(backup.id)?.schema_version ?? 1,
    }));
  }

  async restoreFromBackup(backupId: string) {
    return this.dataSource.transaction(async (manager) => {
      const backup = await manager
        .getRepository(entities.CnfComponentBackup)
        .findOne({ where: { id: backupId } });
      if (!backup) {
        throw new HttpException("Бекап не найден", HttpStatus.NOT_FOUND);
      }
      const backupData = await manager
        .getRepository(entities.CnfComponentBackupData)
        .findOne({ where: { backup_id: backupId } });
      if (!backupData) {
        throw new HttpException(
          "Данные бекапа не найдены",
          HttpStatus.NOT_FOUND,
        );
      }

      const snapshot = backupData.component_data as ComponentBackupSnapshot;
      await this.validateBackupSnapshot(manager, snapshot);

      for (const profileName of COMPONENT_PROFILE_NAMES) {
        await manager.getRepository(PROFILE_ENTITIES[profileName]).delete({});
      }
      await manager.getRepository(CnfComponentSlotEntity).delete({});
      await manager.getRepository(CnfComponentEntity).delete({});

      const componentRepo = manager.getRepository(CnfComponentEntity);
      const slotRepo = manager.getRepository(CnfComponentSlotEntity);
      let profilesCount = 0;
      let slotsCount = 0;

      for (const item of snapshot.components) {
        const componentData = this.restoreBackupDates(item.component);
        await componentRepo.save(componentRepo.create(componentData));

        if (item.slots.length) {
          const restoredSlots = item.slots.map((slot) =>
            slotRepo.create({
              ...this.restoreBackupDates(slot),
              component_id: componentData.id,
            }),
          );
          await slotRepo.save(restoredSlots);
          slotsCount += restoredSlots.length;
        }

        for (const profileName of COMPONENT_PROFILE_NAMES) {
          const profile = item.profiles[profileName];
          if (!profile) continue;

          const repo = manager.getRepository(PROFILE_ENTITIES[profileName]);
          await repo.save(
            repo.create({
              ...this.restoreBackupDates(profile),
              component_id: componentData.id,
            }),
          );
          profilesCount += 1;
        }
      }

      return {
        success: true,
        backup_id: backup.id,
        schema_version: snapshot.schema_version,
        components_count: snapshot.components.length,
        slots_count: slotsCount,
        profiles_count: profilesCount,
      };
    });
  }

  private restoreBackupDates(row: Record<string, any>) {
    const result = { ...row };
    for (const field of ["created_at", "updated_at"]) {
      if (result[field]) result[field] = new Date(result[field]);
    }
    return result;
  }

  private async validateBackupSnapshot(
    manager: EntityManager,
    snapshot: ComponentBackupSnapshot,
  ) {
    if (
      !snapshot ||
      snapshot.schema_version !== CONFIGURATOR_COMPONENT_SCHEMA_VERSION
    ) {
      throw new HttpException(
        `Версия бекапа ${snapshot?.schema_version ?? 1} несовместима с текущей схемой ${CONFIGURATOR_COMPONENT_SCHEMA_VERSION}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!Array.isArray(snapshot.components)) {
      throw new HttpException(
        "Некорректная структура бекапа: components должен быть массивом",
        HttpStatus.BAD_REQUEST,
      );
    }

    const [
      componentTypes,
      slots,
      multislots,
      serverGenerations,
      processorGenerations,
    ] =
      await Promise.all([
        manager.getRepository(entities.CnfComponentTypeEntity).find(),
        manager.getRepository(entities.CnfSlotEntity).find(),
        manager.getRepository(entities.CnfMultislotEntity).find(),
        manager.getRepository(entities.CnfServerGeneration).find(),
        manager.getRepository(entities.CnfProcessorGeneration).find(),
      ]);
    const typeIds = new Set(componentTypes.map((item: any) => item.id));
    const slotIds = new Set(slots.map((item: any) => item.id));
    const multislotIds = new Set(multislots.map((item: any) => item.id));
    const serverGenerationIds = new Set(
      serverGenerations.map((item: any) => item.id),
    );
    const processorGenerationIds = new Set(
      processorGenerations.map((item: any) => item.id),
    );
    const componentIds = new Set<string>();

    for (const relation of snapshot.references?.multislot_slots || []) {
      if (!multislotIds.has(relation.multislot_id)) {
        throw new HttpException(
          `Связь multislot ${relation.id}: multislot ${relation.multislot_id} отсутствует в текущем справочнике`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!slotIds.has(relation.slot_id)) {
        throw new HttpException(
          `Связь multislot ${relation.id}: слот ${relation.slot_id} отсутствует в текущем справочнике`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    for (const [index, item] of snapshot.components.entries()) {
      const component = item?.component;
      const prefix = `Компонент backup[${index}]`;
      if (!component?.id || !component?.name || !component?.type_id) {
        throw new HttpException(
          `${prefix}: отсутствуют id, name или type_id`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (componentIds.has(component.id)) {
        throw new HttpException(
          `${prefix}: дублирующийся id ${component.id}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      componentIds.add(component.id);
      if (!typeIds.has(component.type_id)) {
        throw new HttpException(
          `${prefix}: тип ${component.type_id} отсутствует в текущем справочнике`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        component.server_generation_id &&
        !serverGenerationIds.has(component.server_generation_id)
      ) {
        throw new HttpException(
          `${prefix}: поколение сервера ${component.server_generation_id} отсутствует`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        component.processor_generation_id &&
        !processorGenerationIds.has(component.processor_generation_id)
      ) {
        throw new HttpException(
          `${prefix}: поколение CPU ${component.processor_generation_id} отсутствует`,
          HttpStatus.BAD_REQUEST,
        );
      }
      for (const slot of item.slots || []) {
        if (slot.component_id && slot.component_id !== component.id) {
          throw new HttpException(
            `${prefix}: слот ${slot.id} ссылается на другой component_id`,
            HttpStatus.BAD_REQUEST,
          );
        }
        if (!slotIds.has(slot.slot_id)) {
          throw new HttpException(
            `${prefix}: слот ${slot.slot_id} отсутствует в текущем справочнике`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const profiles = item.profiles || ({} as any);
      const metadata = resolveComponentProfileMetadata(component, {
        ...profiles,
        catalog: null,
      });
      for (const profileName of COMPONENT_PROFILE_NAMES) {
        const profile = profiles[profileName];
        if (!profile) continue;
        if (profile.component_id && profile.component_id !== component.id) {
          throw new HttpException(
            `${prefix}: ${profileName} profile ссылается на другой component_id`,
            HttpStatus.BAD_REQUEST,
          );
        }
        if (
          SPECIALIZED_COMPONENT_PROFILE_NAMES.includes(profileName as any) &&
          profileName !== metadata.profile_kind
        ) {
          throw new HttpException(
            `${prefix}: несовместимый ${profileName} profile для ${component.type_id}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      if (
        profiles.catalog &&
        profiles.catalog.component_type_key !== metadata.component_type_key
      ) {
        throw new HttpException(
          `${prefix}: catalog profile не соответствует component type`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        profiles.resource &&
        profiles.resource.resource_kind !== metadata.resource_kind
      ) {
        throw new HttpException(
          `${prefix}: resource profile не соответствует component type`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        profiles.catalog?.server_generation_id &&
        !serverGenerationIds.has(profiles.catalog.server_generation_id)
      ) {
        throw new HttpException(
          `${prefix}: catalog profile ссылается на отсутствующее поколение сервера ${profiles.catalog.server_generation_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        profiles.catalog?.processor_generation_id &&
        !processorGenerationIds.has(profiles.catalog.processor_generation_id)
      ) {
        throw new HttpException(
          `${prefix}: catalog profile ссылается на отсутствующее поколение CPU ${profiles.catalog.processor_generation_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
  
  async deleteBackup(backupId: string) {
    return this.dataSource.transaction(async (manager) => {
      const backupRepo = manager.getRepository(entities.CnfComponentBackup);
      const backup = await backupRepo.findOne({ where: { id: backupId } });
      if (!backup) {
        throw new HttpException("Бекап не найден", HttpStatus.NOT_FOUND);
      }

      await manager
        .getRepository(entities.CnfComponentBackupData)
        .delete({ backup_id: backupId });
      await backupRepo.delete({ id: backupId });
      return { success: true };
    });
  }
  

  async exportExcel() {
    const components = await this.cnfComponentRepository.find({
      relations: ["slots", "slots.slot"],
    });

    const allServerGenerations = await this.cnfServerGenerationRepo.find();
    const allProcessorGenerations = await this.cnfProcessorGenerationRepo.find();

    const serverGenerationsById = new Map(allServerGenerations.map(gen => [gen.id, gen]));
    const processorGenerationsById = new Map(allProcessorGenerations.map(gen => [gen.id, gen]));

    return Promise.all(components.map(async (component) => {
      const profiles = await this.getComponentProfiles(component.id);
      const result: any = {
        'ID': component.id,
        'Действие': 'upsert',
        'Название': component.name,
        'Подтип': component.subtype || 'Не указано',
        'Цена': component.price || 0,
        'Тип компонента': component.type_id || '',
        'Поколение сервера': component.server_generation_id 
          ? serverGenerationsById.get(component.server_generation_id)?.name || ''
          : '',
        'Поколение процессора': component.processor_generation_id 
          ? processorGenerationsById.get(component.processor_generation_id)?.name || ''
          : '',
      };

      // Добавляем до 5 слотов
      for (let i = 1; i <= 5; i++) {
        const slot = component.slots?.[i - 1];
        if (slot?.slot?.name) {
          // Если слот есть - заполняем все поля
          result[`Слот[${i}]`] = slot.slot.name;
          result[`Количество[${i}]`] = slot.amount || 1;
          result[`Увеличение[${i}]`] = slot.increase ? 'Да' : 'Нет';
        } else {
          // Если слота нет - оставляем поля пустыми
          result[`Слот[${i}]`] = '';
          result[`Количество[${i}]`] = '';
          result[`Увеличение[${i}]`] = '';
        }
      }

      this.appendProfilesToExcelRow(result, profiles);

      return result;
    }));
  }

  getExcelSchema() {
    const schema = [
      {
        column: "ID",
        type: "uuid",
        required: "Нет",
        description: "ID существующего компонента; пустое значение создает новый",
      },
      {
        column: "Действие",
        type: "upsert | delete",
        required: "Нет",
        description: "По умолчанию upsert; delete требует ID существующего компонента",
      },
      {
        column: "Название",
        type: "text",
        required: "Да",
        description: "Название компонента",
      },
      {
        column: "Подтип",
        type: "text",
        required: "Нет",
        description: "SAS, SATA, U.2, M.2 или другой подтип",
      },
      {
        column: "Цена",
        type: "number >= 1",
        required: "Да",
        description: "Базовая цена компонента",
      },
      {
        column: "Тип компонента",
        type: "component type id",
        required: "Да",
        description: "Точный ID из справочника componentType",
      },
      {
        column: "Поколение сервера",
        type: "text",
        required: "Нет",
        description: "Точное название из справочника serverGeneration",
      },
      {
        column: "Поколение процессора",
        type: "text",
        required: "Нет",
        description: "Точное название из справочника processorGeneration",
      },
    ];

    for (let index = 1; index <= 5; index += 1) {
      schema.push(
        {
          column: `Слот[${index}]`,
          type: "text",
          required: "Нет",
          description: "Точное название слота из справочника",
        },
        {
          column: `Количество[${index}]`,
          type: "integer >= 1",
          required: "При наличии слота",
          description: "Количество занимаемых слотов",
        },
        {
          column: `Увеличение[${index}]`,
          type: "boolean",
          required: "При наличии слота",
          description: "Да/Нет, true/false или 1/0",
        },
      );
    }

    for (const [profileName, columns] of Object.entries(
      PROFILE_EXCEL_COLUMNS,
    )) {
      for (const [fieldName, column] of Object.entries(columns)) {
        schema.push({
          column,
          type: PROFILE_NUMBER_FIELDS.has(fieldName)
            ? "number"
            : PROFILE_BOOLEAN_FIELDS.has(fieldName)
              ? "boolean"
              : "text",
          required: "Зависит от profile kind",
          description: `${profileName} profile: ${fieldName}`,
        });
      }
    }

    return schema;
  }

  async importExcel(
    excelData: any[],
    userId?: string,
    options: { dryRun?: boolean; schemaVersion?: number } = {},
  ) {
    const schemaVersion = options.schemaVersion ?? 1;
    if (schemaVersion > CONFIGURATOR_COMPONENT_SCHEMA_VERSION) {
      throw new HttpException(
        `Версия XLSX ${schemaVersion} новее поддерживаемой ${CONFIGURATOR_COMPONENT_SCHEMA_VERSION}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const errors: string[] = [];
    const validatedData: ValidatedExcelComponent[] = [];
    const seenIds = new Set<string>();

    // Получаем все типы, слоты и поколения для валидации
    const [
      allTypes,
      allSlots,
      allServerGenerations,
      allProcessorGenerations,
      existingComponents,
      ...existingProfileCollections
    ] = await Promise.all([
      this.cnfComponentTypeRepository.find(),
      this.cnfSlotRepository.find(),
      this.cnfServerGenerationRepo.find(),
      this.cnfProcessorGenerationRepo.find(),
      this.cnfComponentRepository.find({ relations: ["slots"] }),
      ...COMPONENT_PROFILE_NAMES.map((profileName) =>
        this.dataSource.manager
          .getRepository(PROFILE_ENTITIES[profileName])
          .find(),
      ),
    ]);
    const typesById = new Map(allTypes.map(type => [type.id, type]));
    const slotsByName = new Map(allSlots.map(slot => [slot.name, slot]));
    const serverGenerationsByName = new Map(allServerGenerations.map(gen => [gen.name, gen]));
    const processorGenerationsByName = new Map(allProcessorGenerations.map(gen => [gen.name, gen]));
    const existingById = new Map(
      existingComponents.map((component) => [component.id, component]),
    );
    const existingProfilesByName = Object.fromEntries(
      COMPONENT_PROFILE_NAMES.map((profileName, index) => [
        profileName,
        new Map(
          (existingProfileCollections[index] as any[]).map((profile) => [
            profile.component_id,
            profile,
          ]),
        ),
      ]),
    ) as Record<ComponentProfileName, Map<string, any>>;

    // Валидация всех строк
    for (let rowIndex = 0; rowIndex < excelData.length; rowIndex++) {
      const row = excelData[rowIndex] as ExcelRow;
      const rowNum = rowIndex + 2; // +2 так как в Excel нумерация с 1 и есть заголовок
      const errorsBeforeRow = errors.length;

      // Пропускаем пустые строки
      if (!row || Object.keys(row).length === 0) {
        continue;
      }

      const rawAction = row["Действие"]?.toString()?.trim()?.toLowerCase();
      const action = !rawAction || rawAction === "upsert"
        ? "upsert"
        : rawAction === "delete"
          ? "delete"
          : null;
      if (!action) {
        errors.push(
          `Строка ${rowNum}: Поле "Действие" допускает только upsert или delete`,
        );
        continue;
      }

      const rawId = row.ID?.toString()?.trim();
      if (action === "delete") {
        if (!rawId) {
          errors.push(`Строка ${rowNum}: Для delete обязательно поле ID`);
          continue;
        }
        if (seenIds.has(rawId)) {
          errors.push(`Строка ${rowNum}: ID ${rawId} повторяется в файле`);
          continue;
        }
        seenIds.add(rawId);
        if (!existingById.has(rawId)) {
          errors.push(`Строка ${rowNum}: Компонент с ID ${rawId} не найден`);
          continue;
        }
        validatedData.push({
          row_number: rowNum,
          id: rawId,
          action,
          changed: true,
        });
        continue;
      }

      // Валидация обязательных полей
      if (!row['Название']?.toString()?.trim()) {
        errors.push(`Строка ${rowNum}: Поле "Название" обязательно для заполнения`);
        continue;
      }

      const typeId = row['Тип компонента']?.toString()?.trim();
      if (!typeId) {
        errors.push(`Строка ${rowNum}: Поле "Тип компонента" обязательно`);
        continue;
      }
      if (!typesById.has(typeId)) {
        errors.push(`Строка ${rowNum}: Тип компонента "${typeId}" не найден`);
        continue;
      }

      // Валидация цены
      if (row['Цена'] === undefined || row['Цена'] === null) {
        errors.push(`Строка ${rowNum}: Поле "Цена" обязательно для заполнения`);
        continue;
      }

      const price = Number(row['Цена']);
      if (!Number.isFinite(price) || price < 1) {
        errors.push(`Строка ${rowNum}: Поле "Цена" должно быть числом не меньше 1`);
        continue;
      }

      // Валидация поколения сервера (необязательное поле)
      let serverGenerationId = null;
      const serverGenerationName = row['Поколение сервера']?.toString()?.trim();
      if (serverGenerationName) {
        if (!serverGenerationsByName.has(serverGenerationName)) {
          errors.push(`Строка ${rowNum}: Поколение сервера "${serverGenerationName}" не найдено`);
          continue;
        }
        serverGenerationId = serverGenerationsByName.get(serverGenerationName)!.id;
      }

      // Валидация поколения процессора (необязательное поле)
      let processorGenerationId = null;
      const processorGenerationName = row['Поколение процессора']?.toString()?.trim();
      if (processorGenerationName) {
        if (!processorGenerationsByName.has(processorGenerationName)) {
          errors.push(`Строка ${rowNum}: Поколение процессора "${processorGenerationName}" не найдено`);
          continue;
        }
        processorGenerationId = processorGenerationsByName.get(processorGenerationName)!.id;
      }

      const validatedSlots: any[] = [];

      // Валидация слотов
      for (let i = 1; i <= 5; i++) {
        const slotName = row[`Слот[${i}]` as keyof ExcelRow]?.toString()?.trim();
        const amount = row[`Количество[${i}]` as keyof ExcelRow];
        const increase = row[`Увеличение[${i}]` as keyof ExcelRow];

        if (slotName) {
          // Проверяем существование слота
          if (!slotsByName.has(slotName)) {
            errors.push(`Строка ${rowNum}, колонка "Слот[${i}]": Слот "${slotName}" не найден`);
            continue;
          }

          // Валидация amount - обязательно при указании слота
          if (amount === undefined || amount === null || amount === '') {
            errors.push(`Строка ${rowNum}, колонка "Количество[${i}]": Поле обязательно при указании слота`);
            continue;
          }

          // Валидация increase - обязательно при указании слота
          if (increase === undefined || increase === null || increase === '') {
            errors.push(`Строка ${rowNum}, колонка "Увеличение[${i}]": Поле обязательно при указании слота`);
            continue;
          }

          const numericAmount = Number(amount);
          if (!Number.isInteger(numericAmount) || numericAmount < 1) {
            errors.push(`Строка ${rowNum}, колонка "Количество[${i}]": Значение должно быть целым числом не меньше 1`);
            continue;
          }

          const boolIncrease = this.parseExcelBoolean(increase);
          if (boolIncrease === undefined) {
            errors.push(`Строка ${rowNum}, колонка "Увеличение[${i}]": Допустимы Да/Нет, true/false или 1/0`);
            continue;
          }

          validatedSlots.push({
            slot_id: slotsByName.get(slotName)!.id,
            amount: numericAmount,
            increase: boolIncrease,
          });
        }
      }

      if (errors.length > errorsBeforeRow) continue;

      // Формируем данные для компонента
      const componentData: any = {
        name: row['Название'].toString().trim(),
        subtype:
          !row['Подтип'] || row['Подтип'].toString().trim() === 'Не указано'
            ? null
            : row['Подтип'].toString().trim(),
        price: Number(row['Цена']),
        type_id: typeId,
        server_generation_id: serverGenerationId,
        processor_generation_id: processorGenerationId,
        slots: validatedSlots,
        profiles: this.extractProfilesFromExcelRow(row),
      };

      // Добавляем ID только если он есть и не пустой
      if (rawId) {
        if (seenIds.has(rawId)) {
          errors.push(`Строка ${rowNum}: ID ${rawId} повторяется в файле`);
          continue;
        }
        seenIds.add(rawId);
        if (!existingById.has(rawId)) {
          errors.push(`Строка ${rowNum}: Компонент с ID ${rawId} не найден`);
          continue;
        }
        componentData.id = rawId;
      }

      const profileDto = plainToInstance(
        UpsertComponentProfilesRequestDto,
        componentData.profiles,
      );
      const profileValidationErrors = await validate(profileDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (profileValidationErrors.length) {
        errors.push(
          `Строка ${rowNum}: Некорректные profile.* поля: ${this.formatValidationErrors(profileValidationErrors)}`,
        );
        continue;
      }

      const existingComponent = rawId ? existingById.get(rawId) : null;
      const existingProfiles = rawId
        ? Object.fromEntries(
            COMPONENT_PROFILE_NAMES.map((profileName) => [
              profileName,
              existingProfilesByName[profileName].get(rawId) || null,
            ]),
          )
        : {};
      validatedData.push({
        row_number: rowNum,
        id: rawId || undefined,
        action,
        changed: !existingComponent || this.excelImportWouldChange(
          existingComponent,
          componentData,
          existingProfiles,
        ),
        payload: componentData,
      });
    }

    const report: ComponentImportReport = {
      schema_version: schemaVersion,
      dry_run: Boolean(options.dryRun),
      total_rows: excelData.length,
      valid_rows: validatedData.length,
      added: validatedData.filter(
        (item) => item.action === "upsert" && !item.id,
      ).length,
      updated: validatedData.filter(
        (item) => item.action === "upsert" && item.id && item.changed,
      ).length,
      unchanged: validatedData.filter(
        (item) => item.action === "upsert" && item.id && !item.changed,
      ).length,
      deleted: validatedData.filter((item) => item.action === "delete").length,
      added_ids: [],
      updated_ids: validatedData
        .filter((item) => item.action === "upsert" && item.changed)
        .map((item) => item.id)
        .filter(Boolean) as string[],
      deleted_ids: validatedData
        .filter((item) => item.action === "delete")
        .map((item) => item.id) as string[],
      errors,
      backup_id: null,
    };

    if (options.dryRun) return report;
    if (errors.length) {
      throw new HttpException(
        {
          message: "XLSX содержит ошибки; импорт не выполнялся",
          report,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const backup = await this.createBackupWithManager(
        manager,
        `Авто-бекап перед импортом ${new Date().toLocaleString("ru-RU")}`,
        userId,
      );
      report.backup_id = backup.id;

      for (const item of validatedData) {
        if (item.action === "delete") {
          await this.deleteComponentWithManager(manager, item.id!);
          continue;
        }
        if (item.id && !item.changed) continue;
        const componentRepo = manager.getRepository(CnfComponentEntity);
        const existingComponent = item.id
          ? await componentRepo.findOneBy({ id: item.id })
          : null;
        const saved = await this.saveComponentWithProfiles(
          manager,
          existingComponent,
          item.payload!,
        );
        if (!item.id) report.added_ids.push(saved.component.id);
      }

      return report;
    });
  }

  private appendProfilesToExcelRow(row: any, profiles: any) {
    for (const [profileName, columns] of Object.entries(PROFILE_EXCEL_COLUMNS)) {
      const profile = profiles?.[profileName];
      if (!profile) {
        continue;
      }

      for (const [fieldName, columnName] of Object.entries(columns)) {
        const value = profile[fieldName];
        row[columnName] = value ?? "";
      }
    }
  }

  private extractProfilesFromExcelRow(row: ExcelRow): UpsertComponentProfilesRequestDto {
    const profiles: any = {};

    for (const [profileName, columns] of Object.entries(PROFILE_EXCEL_COLUMNS)) {
      const profile: any = {};

      for (const [fieldName, columnName] of Object.entries(columns)) {
        const rawValue = row[columnName];
        if (rawValue === undefined || rawValue === null || rawValue === "") {
          continue;
        }

        profile[fieldName] = this.normalizeProfileExcelValue(fieldName, rawValue);
      }

      if (Object.keys(profile).length > 0) {
        profiles[profileName] = profile;
      }
    }

    return profiles;
  }

  private normalizeProfileExcelValue(fieldName: string, rawValue: any) {
    if (PROFILE_BOOLEAN_FIELDS.has(fieldName)) {
      return this.parseExcelBoolean(rawValue) ?? rawValue;
    }

    if (PROFILE_NUMBER_FIELDS.has(fieldName)) {
      return Number(rawValue);
    }

    return rawValue.toString().trim();
  }

  private excelImportWouldChange(
    existingComponent: any,
    payload: SaveConfigurationComponentRequestDto,
    existingProfiles: Record<string, any>,
  ) {
    const baseChanged =
      existingComponent.name !== payload.name ||
      (existingComponent.subtype || null) !== (payload.subtype || null) ||
      !this.sameImportValue(existingComponent.price, payload.price) ||
      existingComponent.type_id !== payload.type_id ||
      (existingComponent.server_generation_id || null) !==
        (payload.server_generation_id || null) ||
      (existingComponent.processor_generation_id || null) !==
        (payload.processor_generation_id || null);
    if (baseChanged) return true;

    const normalizeSlots = (slots: any[]) =>
      (slots || [])
        .map((slot) => ({
          slot_id: slot.slot_id,
          amount: Number(slot.amount),
          increase: Boolean(slot.increase),
        }))
        .sort((a, b) =>
          `${a.slot_id}:${a.amount}:${a.increase}`.localeCompare(
            `${b.slot_id}:${b.amount}:${b.increase}`,
          ),
        );
    if (
      JSON.stringify(normalizeSlots(existingComponent.slots)) !==
      JSON.stringify(normalizeSlots(payload.slots || []))
    ) {
      return true;
    }

    const profileData = payload.profiles as Record<string, any>;
    const metadata = resolveComponentProfileMetadata(payload, profileData);
    for (const profileName of COMPONENT_PROFILE_NAMES) {
      const current = existingProfiles[profileName];
      const requested = profileData[profileName];
      const incompatible =
        SPECIALIZED_COMPONENT_PROFILE_NAMES.includes(profileName as any) &&
        profileName !== metadata.profile_kind;
      if (incompatible) {
        if (current) return true;
        continue;
      }
      if (requested === undefined) continue;
      if (requested === null) {
        if (current) return true;
        continue;
      }
      if (!current) return true;

      const normalized = this.normalizeProfileForComponent(
        profileName,
        requested,
        metadata,
      );
      if (
        Object.entries(normalized).some(
          ([field, value]) =>
            !this.sameImportValue(current[field], value),
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private sameImportValue(left: any, right: any) {
    if (left === right) return true;
    if (left == null || right == null) return false;
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber === rightNumber;
    }
    return `${left}` === `${right}`;
  }

  private parseExcelBoolean(value: any): boolean | undefined {
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;

    const normalized = `${value}`.trim().toLowerCase();
    if (["да", "true", "1"].includes(normalized)) return true;
    if (["нет", "false", "0"].includes(normalized)) return false;
    return undefined;
  }

  private formatValidationErrors(errors: any[]): string {
    return errors
      .flatMap((error) => [
        ...Object.values(error.constraints || {}),
        ...(error.children?.length
          ? [
              `${error.property}: ${this.formatValidationErrors(error.children)}`,
            ]
          : []),
      ])
      .join(", ");
  }

  async createComponent(data: SaveConfigurationComponentRequestDto) {
    return this.dataSource.transaction((manager) =>
      this.saveComponentWithProfiles(manager, null, data),
    );
  }

  async updateComponent(
    id: string,
    data: UpdateConfigurationComponentRequestDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const component = await manager
        .getRepository(CnfComponentEntity)
        .findOneBy({ id });

      if (!component) {
        throw new HttpException("Компонент не найден", HttpStatus.NOT_FOUND);
      }

      return this.saveComponentWithProfiles(manager, component, data);
    });
  }

  private async saveComponentWithProfiles(
    manager: EntityManager,
    existingComponent: CnfComponentEntity | null,
    data: SaveConfigurationComponentRequestDto,
  ) {
    const componentType = await manager
      .getRepository(entities.CnfComponentTypeEntity)
      .findOneBy({ id: data.type_id });
    if (!componentType) {
      throw new HttpException(
        "Тип компонента не найден",
        HttpStatus.NOT_FOUND,
      );
    }

    const componentRepo = manager.getRepository(CnfComponentEntity);
    const componentValues = {
      name: data.name,
      price: data.price,
      type_id: data.type_id,
      subtype: data.subtype ?? "",
      server_generation_id: data.server_generation_id ?? null,
      processor_generation_id: data.processor_generation_id ?? null,
    };
    const component = existingComponent
      ? componentRepo.merge(existingComponent, componentValues)
      : componentRepo.create(componentValues);
    const savedComponent = await componentRepo.save(component);

    const slotRepo = manager.getRepository(CnfComponentSlotEntity);
    await slotRepo.delete({ component_id: savedComponent.id });
    if (data.slots?.length) {
      await slotRepo.save(
        data.slots.map((slot) =>
          slotRepo.create({
            component_id: savedComponent.id,
            slot_id: slot.slot_id,
            amount: slot.amount,
            increase: slot.increase ?? false,
          }),
        ),
      );
    }

    await this.applyComponentProfiles(
      manager,
      savedComponent,
      data.profiles,
    );

    return this.getComponentProfiles(savedComponent.id, manager);
  }

  private async deleteComponentWithManager(
    manager: EntityManager,
    componentId: string,
  ) {
    for (const profileName of COMPONENT_PROFILE_NAMES) {
      await manager
        .getRepository(PROFILE_ENTITIES[profileName])
        .delete({ component_id: componentId });
    }
    await manager
      .getRepository(CnfComponentSlotEntity)
      .delete({ component_id: componentId });
    await manager
      .getRepository(CnfComponentEntity)
      .delete({ id: componentId });
  }

  async deleteComponent(id: string) {
    return await this.cnfComponentRepository.delete(id);
  }
}
