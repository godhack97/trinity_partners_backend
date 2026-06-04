import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

type ComponentRow = {
  id: string;
  type_id: string;
  name: string;
  price: number | null;
};

type CpuProfile = {
  socket_profile: string;
  ram_type: string;
  tdp_w: number | null;
  memory_channels: number;
  max_ram_modules_per_cpu: number;
  max_ram_gb_per_cpu: number;
  memory_speed_1dpc: number;
  memory_speed_2dpc: number;
};

type RamProfile = {
  ram_type: string;
  capacity_gb: number;
  frequency_mhz: number | null;
  rank: string | null;
  form_factor: string;
};

type DriveProfile = {
  drive_type: string;
  interface_type: string;
  media_kind: string;
  form_factor: string;
  capacity_gb: number;
  speed_class: string | null;
  workload_class: string | null;
  pcie_lanes: number;
  power_w: number;
};

const TYPE_KEYS: Record<string, string> = {
  "cpu-type-id": "cpu",
  "ram-type-id": "ram",
  "memory-type-id": "drive",
};

export class SeedConfiguratorComponentProfiles1776178200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const components: ComponentRow[] = await queryRunner.query(`
      SELECT id, type_id, name, price
      FROM cnf_components
      WHERE type_id IN ('cpu-type-id', 'ram-type-id', 'memory-type-id')
    `);

    for (const component of components) {
      const typeKey = TYPE_KEYS[component.type_id];

      if (!typeKey) {
        continue;
      }

      await this.seedCatalogProfile(queryRunner, component, typeKey);
      await this.seedPriceProfile(queryRunner, component);

      if (typeKey === "cpu") {
        const profile = this.parseCpuProfile(component.name);

        if (profile) {
          await this.seedCpuProfile(queryRunner, component.id, profile);
          await this.seedResourceProfile(queryRunner, component.id, "cpu", {
            power_w: profile.tdp_w,
            uses_power: true,
          });
        }
      }

      if (typeKey === "ram") {
        const profile = this.parseRamProfile(component.name);

        if (profile) {
          await this.seedRamProfile(queryRunner, component.id, profile);
          await this.seedResourceProfile(queryRunner, component.id, "ram", {
            power_w: this.estimateRamPower(profile.capacity_gb),
            uses_power: true,
          });
        }
      }

      if (typeKey === "drive") {
        const profile = this.parseDriveProfile(component.name);

        if (profile) {
          await this.seedDriveProfile(queryRunner, component.id, profile);
          await this.seedResourceProfile(queryRunner, component.id, "drive", {
            pcie_lanes: 0,
            power_w: profile.power_w,
            uses_power: true,
          });
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const componentIds = await queryRunner.query(`
      SELECT id
      FROM cnf_components
      WHERE type_id IN ('cpu-type-id', 'ram-type-id', 'memory-type-id')
    `);
    const ids = componentIds.map((row: { id: string }) => row.id);

    if (!ids.length) {
      return;
    }

    await queryRunner.query(
      `DELETE FROM cnf_drive_profiles WHERE component_id IN (?)`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM cnf_ram_profiles WHERE component_id IN (?)`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM cnf_cpu_profiles WHERE component_id IN (?)`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM cnf_component_resource_profiles WHERE component_id IN (?)`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM cnf_component_price_profiles WHERE component_id IN (?)`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM cnf_component_catalog_profiles WHERE component_id IN (?)`,
      [ids],
    );
  }

  private async seedCatalogProfile(
    queryRunner: QueryRunner,
    component: ComponentRow,
    typeKey: string,
  ) {
    if (await this.exists(queryRunner, "cnf_component_catalog_profiles", component.id)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_component_catalog_profiles (
          id,
          component_id,
          component_type_key,
          client_display_mode,
          is_active
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        component.id,
        typeKey,
        typeKey === "drive" ? "anonymous" : "full",
        1,
      ],
    );
  }

  private async seedPriceProfile(queryRunner: QueryRunner, component: ComponentRow) {
    if (await this.exists(queryRunner, "cnf_component_price_profiles", component.id)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_component_price_profiles (
          id,
          component_id,
          base_price,
          currency,
          coefficient,
          price_mode,
          price_required
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        component.id,
        component.price,
        "USD",
        3.6,
        "component_price",
        1,
      ],
    );
  }

  private async seedResourceProfile(
    queryRunner: QueryRunner,
    componentId: string,
    resourceKind: string,
    values: {
      pcie_lanes?: number;
      rear_pcie_lanes?: number;
      physical_slots?: number;
      ocp_slots?: number;
      internal_ports?: number;
      power_w?: number | null;
      uses_power?: boolean;
    },
  ) {
    if (await this.exists(queryRunner, "cnf_component_resource_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_component_resource_profiles (
          id,
          component_id,
          resource_kind,
          pcie_lanes,
          rear_pcie_lanes,
          physical_slots,
          ocp_slots,
          internal_ports,
          power_w,
          uses_power
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        resourceKind,
        values.pcie_lanes ?? 0,
        values.rear_pcie_lanes ?? 0,
        values.physical_slots ?? 0,
        values.ocp_slots ?? 0,
        values.internal_ports ?? 0,
        values.power_w ?? null,
        values.uses_power === false ? 0 : 1,
      ],
    );
  }

  private async seedCpuProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: CpuProfile,
  ) {
    if (await this.exists(queryRunner, "cnf_cpu_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_cpu_profiles (
          id,
          component_id,
          socket_profile,
          ram_type,
          tdp_w,
          memory_channels,
          max_ram_modules_per_cpu,
          max_ram_gb_per_cpu,
          memory_speed_1dpc,
          memory_speed_2dpc
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        profile.socket_profile,
        profile.ram_type,
        profile.tdp_w,
        profile.memory_channels,
        profile.max_ram_modules_per_cpu,
        profile.max_ram_gb_per_cpu,
        profile.memory_speed_1dpc,
        profile.memory_speed_2dpc,
      ],
    );
  }

  private async seedRamProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: RamProfile,
  ) {
    if (await this.exists(queryRunner, "cnf_ram_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_ram_profiles (
          id,
          component_id,
          ram_type,
          capacity_gb,
          frequency_mhz,
          rank,
          form_factor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        profile.ram_type,
        profile.capacity_gb,
        profile.frequency_mhz,
        profile.rank,
        profile.form_factor,
      ],
    );
  }

  private async seedDriveProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: DriveProfile,
  ) {
    if (await this.exists(queryRunner, "cnf_drive_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_drive_profiles (
          id,
          component_id,
          drive_type,
          interface_type,
          media_kind,
          form_factor,
          capacity_gb,
          speed_class,
          workload_class,
          pcie_lanes,
          power_w
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        profile.drive_type,
        profile.interface_type,
        profile.media_kind,
        profile.form_factor,
        profile.capacity_gb,
        profile.speed_class,
        profile.workload_class,
        profile.pcie_lanes,
        profile.power_w,
      ],
    );
  }

  private async exists(
    queryRunner: QueryRunner,
    tableName: string,
    componentId: string,
  ) {
    const rows = await queryRunner.query(
      `SELECT id FROM ${tableName} WHERE component_id = ? LIMIT 1`,
      [componentId],
    );

    return Boolean(rows?.[0]?.id);
  }

  private parseCpuProfile(name: string): CpuProfile | null {
    const normalized = this.normalize(name);
    const modelMatch = normalized.match(/Xeon\s+(?:Bronze|Silver|Gold|Platinum)\s+([0-9]{4})/i);

    if (!modelMatch) {
      return null;
    }

    const model = modelMatch[1];
    const generationDigit = model[1];
    const isDdr4 = generationDigit === "3";
    const tdpMatch = normalized.match(/([0-9]{2,3})W/i);
    const socketMatch = normalized.match(/-\s*([1248]S)\b/i);

    return {
      socket_profile: socketMatch?.[1]?.toUpperCase() || "2S",
      ram_type: isDdr4 ? "DDR4" : "DDR5",
      tdp_w: tdpMatch ? Number(tdpMatch[1]) : null,
      memory_channels: 8,
      max_ram_modules_per_cpu: 16,
      max_ram_gb_per_cpu: isDdr4 ? 4096 : 4096,
      memory_speed_1dpc: isDdr4
        ? 3200
        : generationDigit === "5"
          ? 5600
          : 4800,
      memory_speed_2dpc: isDdr4 ? 2933 : 4400,
    };
  }

  private parseRamProfile(name: string): RamProfile | null {
    const normalized = this.normalize(name);
    const capacityMatch = normalized.match(/([0-9]+)\s*GB/i);
    const ramTypeMatch = normalized.match(/DDR([45])/i);
    const frequencyMatch = normalized.match(/DDR[45]-([0-9]{4})/i);

    if (!capacityMatch || !ramTypeMatch) {
      return null;
    }

    return {
      ram_type: `DDR${ramTypeMatch[1]}`,
      capacity_gb: Number(capacityMatch[1]),
      frequency_mhz: frequencyMatch ? Number(frequencyMatch[1]) : null,
      rank: null,
      form_factor: "RDIMM",
    };
  }

  private parseDriveProfile(name: string): DriveProfile | null {
    const normalized = this.normalize(name);
    const upper = normalized.toUpperCase();
    const capacityGb = this.parseCapacityGb(normalized);

    if (!capacityGb) {
      return null;
    }

    const isM2 = upper.includes("M.2");
    const isNvme = upper.includes("NVME");
    const isSas = upper.includes("SAS");
    const isSata = upper.includes("SATA");

    if (!isM2 && !isNvme && !isSas && !isSata) {
      return null;
    }

    const driveType = isM2 ? "M.2" : isNvme ? "NVME" : isSas ? "SAS" : "SATA";
    const mediaKind = isM2 || isNvme
      ? "NVME"
      : upper.includes("SSD")
        ? "SSD"
        : "HDD";
    const formFactor = isM2
      ? "M.2"
      : normalized.includes('3.5"')
        ? "3.5"
        : "2.5";

    return {
      drive_type: driveType,
      interface_type: isM2 ? "NVME" : driveType,
      media_kind: mediaKind,
      form_factor: formFactor,
      capacity_gb: capacityGb,
      speed_class: this.parseSpeedClass(normalized),
      workload_class: this.parseWorkloadClass(normalized),
      pcie_lanes: driveType === "NVME" ? 4 : 0,
      power_w: this.estimateDrivePower(driveType, formFactor),
    };
  }

  private parseCapacityGb(name: string) {
    const tbMatch = name.match(/([0-9]+(?:[.,][0-9]+)?)\s*T[Bb]/);
    if (tbMatch) {
      return Math.round(Number(tbMatch[1].replace(",", ".")) * 1024);
    }

    const gbMatch = name.match(/([0-9]+(?:[.,][0-9]+)?)\s*G[Bb]/);
    if (gbMatch) {
      return Math.round(Number(gbMatch[1].replace(",", ".")));
    }

    return null;
  }

  private parseSpeedClass(name: string) {
    const rpmMatch = name.match(/([0-9]{4,5})\s*rpm/i);
    if (rpmMatch) {
      return `${rpmMatch[1]}rpm`;
    }

    return name.toUpperCase().includes("SSD") || name.toUpperCase().includes("NVME")
      ? "SSD"
      : null;
  }

  private parseWorkloadClass(name: string) {
    const dwpdMatch = name.match(/([0-9]+)\s*DWPD/i);
    return dwpdMatch ? `${dwpdMatch[1]}DWPD` : null;
  }

  private estimateRamPower(capacityGb: number) {
    if (capacityGb >= 128) return 18;
    if (capacityGb >= 64) return 14;
    if (capacityGb >= 32) return 10;
    return 8;
  }

  private estimateDrivePower(driveType: string, formFactor: string) {
    if (driveType === "NVME" || driveType === "M.2") return 12;
    if (driveType === "SAS") return formFactor === "3.5" ? 14 : 10;
    return formFactor === "3.5" ? 10 : 6;
  }

  private normalize(value: string) {
    return `${value || ""}`.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
}
