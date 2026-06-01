import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

type ComponentRow = {
  id: string;
  type_id: string;
  name: string;
  price: number | null;
};

type ControllerProfile = {
  component_type_key: string;
  controller_type: string;
  pcie_lanes: number;
  rear_pcie_lanes: number;
  physical_slots: number;
  internal_ports: number;
  supports_sata: boolean;
  supports_sas: boolean;
  supports_nvme: boolean;
  power_w: number | null;
};

export class SeedConfiguratorControllerProfiles1776178300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const components: ComponentRow[] = await queryRunner.query(`
      SELECT id, type_id, name, price
      FROM cnf_components
      WHERE type_id IN (
        'raid-controller-type-id',
        'hba-type-id',
        'ehba-type-id'
      )
    `);

    for (const component of components) {
      const profile = this.parseControllerProfile(component);

      if (!profile) {
        continue;
      }

      await this.seedCatalogProfile(queryRunner, component, profile.component_type_key);
      await this.seedPriceProfile(queryRunner, component);
      await this.seedControllerProfile(queryRunner, component.id, profile);
      await this.seedResourceProfile(queryRunner, component.id, profile);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const componentIds = await queryRunner.query(`
      SELECT id
      FROM cnf_components
      WHERE type_id IN (
        'raid-controller-type-id',
        'hba-type-id',
        'ehba-type-id'
      )
    `);
    const ids = componentIds.map((row: { id: string }) => row.id);

    if (!ids.length) {
      return;
    }

    await queryRunner.query(
      `DELETE FROM cnf_controller_profiles WHERE component_id IN (?)`,
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

  private parseControllerProfile(component: ComponentRow): ControllerProfile | null {
    const name = this.normalize(component.name);
    const upper = name.toUpperCase();

    if (upper.includes("VROC")) {
      return {
        component_type_key: "vroc",
        controller_type: "VROC",
        pcie_lanes: 0,
        rear_pcie_lanes: 0,
        physical_slots: 0,
        internal_ports: 0,
        supports_sata: false,
        supports_sas: false,
        supports_nvme: true,
        power_w: 0,
      };
    }

    const isRaid = component.type_id === "raid-controller-type-id";
    const isHba = component.type_id === "hba-type-id";
    const isEhba = component.type_id === "ehba-type-id";

    if (!isRaid && !isHba && !isEhba) {
      return null;
    }

    return {
      component_type_key: isRaid ? "raid" : isHba ? "hba" : "ehba",
      controller_type: isRaid ? "RAID" : isHba ? "HBA" : "eHBA",
      pcie_lanes: 8,
      rear_pcie_lanes: 8,
      physical_slots: 1,
      internal_ports: this.parseInternalPorts(upper),
      supports_sata: !isEhba,
      supports_sas: true,
      supports_nvme: false,
      power_w: 15,
    };
  }

  private parseInternalPorts(upperName: string) {
    const compactMatch = upperName.match(/([0-9]+)I([0-9]+)E/);

    if (compactMatch) {
      return Number(compactMatch[1]);
    }

    const internalMatch = upperName.match(/([0-9]+)I\b/);

    if (internalMatch) {
      return Number(internalMatch[1]);
    }

    return 0;
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
      [randomUUID(), component.id, typeKey, "full", 1],
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

  private async seedControllerProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: ControllerProfile,
  ) {
    if (await this.exists(queryRunner, "cnf_controller_profiles", componentId)) {
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO cnf_controller_profiles (
          id,
          component_id,
          controller_type,
          pcie_lanes,
          rear_pcie_lanes,
          physical_slots,
          internal_ports,
          supports_sata,
          supports_sas,
          supports_nvme,
          power_w
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        componentId,
        profile.controller_type,
        profile.pcie_lanes,
        profile.rear_pcie_lanes,
        profile.physical_slots,
        profile.internal_ports,
        profile.supports_sata ? 1 : 0,
        profile.supports_sas ? 1 : 0,
        profile.supports_nvme ? 1 : 0,
        profile.power_w,
      ],
    );
  }

  private async seedResourceProfile(
    queryRunner: QueryRunner,
    componentId: string,
    profile: ControllerProfile,
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
        profile.component_type_key === "vroc" ? "controller" : "pcie_card",
        profile.pcie_lanes,
        profile.rear_pcie_lanes,
        profile.physical_slots,
        0,
        profile.internal_ports,
        profile.power_w,
        profile.power_w == null || profile.power_w === 0 ? 0 : 1,
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
