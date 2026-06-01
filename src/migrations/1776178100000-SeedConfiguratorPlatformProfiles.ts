import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

type PlatformSeed = {
  serverNameLike: string;
  profile: {
    platform_code: string;
    family: string;
    mode: string;
    cpu_limit: number;
    ram_type: string;
    pcie_generation: string;
    pcie_lanes_per_cpu: number;
    pcie_lanes_total: number;
    rear_pcie_ocp_limit: number;
    pcie_slots: number;
    ocp_slots: number;
    base_power_w: number;
    direct_sata_limit: number;
    internal_m2_bays: number;
    is_active: boolean;
  };
  bays: Array<{
    placement: string;
    bay_kind: string;
    form_factor: string;
    capacity: number;
    allowed_drive_types: string[];
    pcie_lanes_per_nvme: number | null;
    counts_to_rear_pcie: boolean;
  }>;
  forbidden_component_types?: Array<{
    component_type_key: string;
    reason: string;
  }>;
};

const SEEDS: PlatformSeed[] = [
  {
    serverNameLike: "%ER220HDR-M8%",
    profile: {
      platform_code: "ER220HDR-M8",
      family: "ER220",
      mode: "standard",
      cpu_limit: 2,
      ram_type: "DDR5",
      pcie_generation: "5.0",
      pcie_lanes_per_cpu: 80,
      pcie_lanes_total: 160,
      rear_pcie_ocp_limit: 96,
      pcie_slots: 6,
      ocp_slots: 1,
      base_power_w: 360,
      direct_sata_limit: 12,
      internal_m2_bays: 2,
      is_active: true,
    },
    bays: [
      {
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 12,
        allowed_drive_types: ["SATA", "SAS", "NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: false,
      },
      {
        placement: "rear",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 4,
        allowed_drive_types: ["SATA", "SAS", "NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: true,
      },
    ],
  },
  {
    serverNameLike: "%ER225HR-M8%",
    profile: {
      platform_code: "ER225HR-M8",
      family: "ER225",
      mode: "standard",
      cpu_limit: 2,
      ram_type: "DDR5",
      pcie_generation: "5.0",
      pcie_lanes_per_cpu: 80,
      pcie_lanes_total: 160,
      rear_pcie_ocp_limit: 96,
      pcie_slots: 6,
      ocp_slots: 1,
      base_power_w: 360,
      direct_sata_limit: 0,
      internal_m2_bays: 2,
      is_active: true,
    },
    bays: [
      {
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 24,
        allowed_drive_types: ["NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: false,
      },
      {
        placement: "rear",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 4,
        allowed_drive_types: ["SATA", "SAS", "NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: true,
      },
    ],
  },
  {
    serverNameLike: "%ER225HSR-M8%",
    profile: {
      platform_code: "ER225HSR-M8",
      family: "ER225",
      mode: "standard",
      cpu_limit: 2,
      ram_type: "DDR5",
      pcie_generation: "5.0",
      pcie_lanes_per_cpu: 80,
      pcie_lanes_total: 160,
      rear_pcie_ocp_limit: 96,
      pcie_slots: 6,
      ocp_slots: 1,
      base_power_w: 360,
      direct_sata_limit: 0,
      internal_m2_bays: 2,
      is_active: true,
    },
    bays: [
      {
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 8,
        allowed_drive_types: ["NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: false,
      },
      {
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 16,
        allowed_drive_types: ["SATA", "SAS"],
        pcie_lanes_per_nvme: null,
        counts_to_rear_pcie: false,
      },
      {
        placement: "rear",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 4,
        allowed_drive_types: ["SATA", "SAS", "NVME"],
        pcie_lanes_per_nvme: 4,
        counts_to_rear_pcie: true,
      },
    ],
  },
  {
    serverNameLike: "%ER225HTR-M8%",
    profile: {
      platform_code: "ER225HTR-M8",
      family: "ER225HTR",
      mode: "ocp_only",
      cpu_limit: 2,
      ram_type: "DDR5",
      pcie_generation: "5.0",
      pcie_lanes_per_cpu: 80,
      pcie_lanes_total: 160,
      rear_pcie_ocp_limit: 0,
      pcie_slots: 0,
      ocp_slots: 8,
      base_power_w: 360,
      direct_sata_limit: 2,
      internal_m2_bays: 2,
      is_active: false,
    },
    bays: [
      {
        placement: "front",
        bay_kind: "drive",
        form_factor: "2.5",
        capacity: 2,
        allowed_drive_types: ["SATA"],
        pcie_lanes_per_nvme: null,
        counts_to_rear_pcie: false,
      },
      {
        placement: "internal",
        bay_kind: "m2",
        form_factor: "M.2",
        capacity: 2,
        allowed_drive_types: ["M.2"],
        pcie_lanes_per_nvme: null,
        counts_to_rear_pcie: false,
      },
    ],
    forbidden_component_types: [
      {
        component_type_key: "gpu",
        reason: "Плутон поддерживает только OCP-расширение",
      },
      {
        component_type_key: "nic",
        reason: "Сеть на Плутоне доступна только через OCP",
      },
      {
        component_type_key: "raid",
        reason: "Плутон не поддерживает обычные PCIe-контроллеры",
      },
      {
        component_type_key: "hba",
        reason: "Плутон не поддерживает обычные PCIe-контроллеры",
      },
      {
        component_type_key: "ehba",
        reason: "Плутон не поддерживает обычные PCIe-контроллеры",
      },
      {
        component_type_key: "vroc",
        reason: "Плутон не поддерживает VROC-сценарии в текущей итерации",
      },
      {
        component_type_key: "ssd_nvme",
        reason: "U.2 NVMe на Плутоне запрещен",
      },
      {
        component_type_key: "extra_option",
        reason: "Внешние PCIe-опции на Плутоне запрещены",
      },
    ],
  },
];

export class SeedConfiguratorPlatformProfiles1776178100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const seed of SEEDS) {
      await this.seedPlatform(queryRunner, seed);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const platformCodes = SEEDS.map((seed) => seed.profile.platform_code);
    await queryRunner.query(
      `DELETE FROM cnf_platform_profiles WHERE platform_code IN (?)`,
      [platformCodes],
    );
  }

  private async seedPlatform(queryRunner: QueryRunner, seed: PlatformSeed) {
    const servers = await queryRunner.query(
      `SELECT id FROM cnf_servers WHERE name LIKE ? ORDER BY name ASC LIMIT 1`,
      [seed.serverNameLike],
    );

    const server = servers?.[0];

    if (!server?.id) {
      return;
    }

    const existingProfiles = await queryRunner.query(
      `SELECT id FROM cnf_platform_profiles WHERE server_id = ? LIMIT 1`,
      [server.id],
    );

    if (existingProfiles?.[0]?.id) {
      return;
    }

    const profileId = randomUUID();
    const { profile } = seed;

    await queryRunner.query(
      `
        INSERT INTO cnf_platform_profiles (
          id,
          server_id,
          platform_code,
          family,
          mode,
          cpu_limit,
          ram_type,
          pcie_generation,
          pcie_lanes_per_cpu,
          pcie_lanes_total,
          rear_pcie_ocp_limit,
          pcie_slots,
          ocp_slots,
          base_power_w,
          direct_sata_limit,
          internal_m2_bays,
          is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        profileId,
        server.id,
        profile.platform_code,
        profile.family,
        profile.mode,
        profile.cpu_limit,
        profile.ram_type,
        profile.pcie_generation,
        profile.pcie_lanes_per_cpu,
        profile.pcie_lanes_total,
        profile.rear_pcie_ocp_limit,
        profile.pcie_slots,
        profile.ocp_slots,
        profile.base_power_w,
        profile.direct_sata_limit,
        profile.internal_m2_bays,
        profile.is_active ? 1 : 0,
      ],
    );

    for (const bay of seed.bays) {
      await queryRunner.query(
        `
          INSERT INTO cnf_platform_bays (
            id,
            platform_profile_id,
            placement,
            bay_kind,
            form_factor,
            capacity,
            allowed_drive_types,
            pcie_lanes_per_nvme,
            counts_to_rear_pcie
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          profileId,
          bay.placement,
          bay.bay_kind,
          bay.form_factor,
          bay.capacity,
          JSON.stringify(bay.allowed_drive_types),
          bay.pcie_lanes_per_nvme,
          bay.counts_to_rear_pcie ? 1 : 0,
        ],
      );
    }

    for (const rule of seed.forbidden_component_types || []) {
      await queryRunner.query(
        `
          INSERT INTO cnf_platform_forbidden_component_types (
            id,
            platform_profile_id,
            component_type_key,
            reason
          )
          VALUES (?, ?, ?, ?)
        `,
        [randomUUID(), profileId, rule.component_type_key, rule.reason],
      );
    }
  }
}
