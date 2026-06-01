import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

type ComponentRow = {
  id: string;
  type_id: string;
  name: string;
  price: number | null;
};

type NetworkProfile = {
  component_type_key: string;
  network_kind: string;
  port_type: string | null;
  port_speed: string | null;
  ports_count: number;
  pcie_lanes: number;
  rear_pcie_lanes: number;
  physical_slots: number;
  ocp_slots: number;
  power_w: number;
};

type GpuProfile = {
  pcie_lanes: number;
  rear_pcie_lanes: number;
  physical_slots: number;
  power_w: number | null;
};

type TransceiverProfile = {
  interface_type: string;
  speed: string | null;
  media_type: string | null;
  wavelength: string | null;
  compatible_port_type: string;
};

export class SeedConfiguratorPeripheralProfiles1776178400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const components: ComponentRow[] = await queryRunner.query(`
      SELECT id, type_id, name, price
      FROM cnf_components
      WHERE type_id IN (
        'network-card-type-id',
        'nic1-type-id',
        'nic2-type-id',
        'ocp-type-id',
        'gpu-type-id',
        'transiver-type-id'
      )
    `);

    for (const component of components) {
      if (this.isNetwork(component)) {
        const profile = this.parseNetworkProfile(component);
        await this.seedCatalogProfile(queryRunner, component, profile.component_type_key, "anonymous");
        await this.seedPriceProfile(queryRunner, component);
        await this.seedNetworkProfile(queryRunner, component.id, profile);
        await this.seedResourceProfile(queryRunner, component.id, profile.component_type_key, {
          pcie_lanes: profile.pcie_lanes,
          rear_pcie_lanes: profile.rear_pcie_lanes,
          physical_slots: profile.physical_slots,
          ocp_slots: profile.ocp_slots,
          power_w: profile.power_w,
          uses_power: true,
        });
        continue;
      }

      if (component.type_id === "gpu-type-id") {
        const profile = this.parseGpuProfile(component);
        await this.seedCatalogProfile(queryRunner, component, "gpu", "full");
        await this.seedPriceProfile(queryRunner, component);
        await this.seedGpuProfile(queryRunner, component.id, profile);
        await this.seedResourceProfile(queryRunner, component.id, "gpu", {
          pcie_lanes: profile.pcie_lanes,
          rear_pcie_lanes: profile.rear_pcie_lanes,
          physical_slots: profile.physical_slots,
          power_w: profile.power_w,
          uses_power: profile.power_w != null,
        });
        continue;
      }

      if (component.type_id === "transiver-type-id") {
        const profile = this.parseTransceiverProfile(component.name);
        await this.seedCatalogProfile(queryRunner, component, "transceiver", "anonymous");
        await this.seedPriceProfile(queryRunner, component);
        await this.seedTransceiverProfile(queryRunner, component.id, profile);
        await this.seedResourceProfile(queryRunner, component.id, "none", {
          uses_power: false,
        });
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const componentIds = await queryRunner.query(`
      SELECT id
      FROM cnf_components
      WHERE type_id IN (
        'network-card-type-id',
        'nic1-type-id',
        'nic2-type-id',
        'ocp-type-id',
        'gpu-type-id',
        'transiver-type-id'
      )
    `);
    const ids = componentIds.map((row: { id: string }) => row.id);

    if (!ids.length) {
      return;
    }

    await queryRunner.query(
      `DELETE FROM cnf_transceiver_profiles WHERE component_id IN (?)`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM cnf_gpu_profiles WHERE component_id IN (?)`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM cnf_network_profiles WHERE component_id IN (?)`,
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

  private isNetwork(component: ComponentRow) {
    return [
      "network-card-type-id",
      "nic1-type-id",
      "nic2-type-id",
      "ocp-type-id",
    ].includes(component.type_id);
  }

  private parseNetworkProfile(component: ComponentRow): NetworkProfile {
    const name = this.normalize(component.name);
    const upper = name.toUpperCase();
    const isOcp = component.type_id === "ocp-type-id";
    const portsCount = Number(upper.match(/([0-9]+)-PORT/)?.[1] || 1);
    const portType = this.parsePortType(upper);
    const speed = this.parseSpeed(upper);

    return {
      component_type_key: isOcp ? "ocp" : "nic",
      network_kind: isOcp ? "ocp" : upper.includes("FC") || upper.includes("FIBRECHANNEL") ? "fc" : "nic",
      port_type: portType,
      port_speed: speed,
      ports_count: portsCount,
      pcie_lanes: speed === "100Gbps" ? 16 : 8,
      rear_pcie_lanes: isOcp ? 16 : speed === "100Gbps" ? 16 : 8,
      physical_slots: isOcp ? 0 : 1,
      ocp_slots: isOcp ? 1 : 0,
      power_w: speed === "100Gbps" ? 25 : 12,
    };
  }

  private parseGpuProfile(component: ComponentRow): GpuProfile {
    const upper = this.normalize(component.name).toUpperCase();
    const highPower =
      upper.includes("A100") ||
      upper.includes("H100") ||
      upper.includes("A40") ||
      upper.includes("L40") ||
      upper.includes("RTX 6000");
    const midPower =
      upper.includes("A10") ||
      upper.includes("A16") ||
      upper.includes("A30") ||
      upper.includes("RTX 4000") ||
      upper.includes("RTX 5000") ||
      upper.includes("A4000") ||
      upper.includes("A5000");

    return {
      pcie_lanes: 16,
      rear_pcie_lanes: 16,
      physical_slots: highPower ? 2 : 1,
      power_w: highPower ? 300 : midPower ? 150 : 75,
    };
  }

  private parseTransceiverProfile(name: string): TransceiverProfile {
    const upper = this.normalize(name).toUpperCase();
    const interfaceType = this.parsePortType(upper) || "SFP+";

    return {
      interface_type: interfaceType,
      speed: this.parseSpeed(upper),
      media_type: upper.includes("RJ-45") ? "copper" : "optical",
      wavelength: upper.includes(" LR") ? "LR" : upper.includes(" SR") ? "SR" : null,
      compatible_port_type: interfaceType,
    };
  }

  private parsePortType(upperName: string) {
    if (upperName.includes("QSFP28")) return "QSFP28";
    if (upperName.includes("QSFP+")) return "QSFP+";
    if (upperName.includes("SFP28")) return "SFP28";
    if (upperName.includes("SFP+")) return "SFP+";
    if (upperName.includes("RJ-45")) return "RJ-45";
    if (upperName.includes("FC") || upperName.includes("FIBRECHANNEL")) return "FC";
    return null;
  }

  private parseSpeed(upperName: string) {
    const dualSpeed = upperName.match(/([0-9]+)\/([0-9]+)\s*GBPS/);
    if (dualSpeed) {
      return `${dualSpeed[2]}Gbps`;
    }

    const gbps = upperName.match(/([0-9]+)\s*GBPS/);
    if (gbps) {
      return `${gbps[1]}Gbps`;
    }

    const gbSlash = upperName.match(/([0-9]+)\s*GB\\S/);
    if (gbSlash) {
      return `${gbSlash[1]}Gbps`;
    }

    return null;
  }

  private async seedCatalogProfile(
    queryRunner: QueryRunner,
    component: ComponentRow,
    typeKey: string,
    displayMode: string,
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
      [randomUUID(), component.id, typeKey, displayMode, 1],
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
      [randomUUID(), component.id, component.price, "USD", 3.6, "component_price", 1],
    );
  }

  private async seedNetworkProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: NetworkProfile,
  ) {
    if (await this.exists(queryRunner, "cnf_network_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_network_profiles (
          id,
          component_id,
          network_kind,
          port_type,
          port_speed,
          ports_count,
          pcie_lanes,
          rear_pcie_lanes,
          physical_slots,
          ocp_slots,
          power_w
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        profile.network_kind,
        profile.port_type,
        profile.port_speed,
        profile.ports_count,
        profile.pcie_lanes,
        profile.rear_pcie_lanes,
        profile.physical_slots,
        profile.ocp_slots,
        profile.power_w,
      ],
    );
  }

  private async seedGpuProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: GpuProfile,
  ) {
    if (await this.exists(queryRunner, "cnf_gpu_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_gpu_profiles (
          id,
          component_id,
          pcie_lanes,
          rear_pcie_lanes,
          physical_slots,
          power_w
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        profile.pcie_lanes,
        profile.rear_pcie_lanes,
        profile.physical_slots,
        profile.power_w,
      ],
    );
  }

  private async seedTransceiverProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: TransceiverProfile,
  ) {
    if (await this.exists(queryRunner, "cnf_transceiver_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_transceiver_profiles (
          id,
          component_id,
          interface_type,
          speed,
          media_type,
          wavelength,
          compatible_port_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        profile.interface_type,
        profile.speed,
        profile.media_type,
        profile.wavelength,
        profile.compatible_port_type,
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
        0,
        values.power_w ?? null,
        values.uses_power === false ? 0 : 1,
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

  private normalize(value: string) {
    return `${value || ""}`.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }
}
