import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

const PLATFORM_CODE = "ER225HTR-M8";
const PLATFORM_DESCRIPTION =
  "Платформа ER225HTR-M8 (2*CPU Intel Xeon 4/5 Scalable, TDP 225W, 32*DDR5 ECC RDIMM/, 2*SFF SATA, 2*M.2 2280 PCIe, 8*OCP 3.0, 2U 19”, depth 600mm)";
const FORBIDDEN_COMPONENT_TYPES = [
  "gpu",
  "nic",
  "raid",
  "hba",
  "ehba",
  "vroc",
];

export class AddEr225HtrM8Platform1780317100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingProfiles = await queryRunner.query(
      `SELECT id, server_id FROM cnf_platform_profiles WHERE platform_code = ? LIMIT 1`,
      [PLATFORM_CODE],
    );

    let serverId = existingProfiles?.[0]?.server_id;
    let profileId = existingProfiles?.[0]?.id;

    if (!serverId) {
      const existingServers = await queryRunner.query(
        `SELECT id FROM cnf_servers WHERE name LIKE ? ORDER BY name ASC LIMIT 1`,
        [`%${PLATFORM_CODE}%`],
      );
      serverId = existingServers?.[0]?.id;
    }

    if (!serverId) {
      const generations = await queryRunner.query(
        `
          SELECT id
          FROM cnf_server_generation
          WHERE name IN ('Gen4/5/M8', 'M8')
          ORDER BY name = 'Gen4/5/M8' DESC
          LIMIT 1
        `,
      );
      const heights = await queryRunner.query(
        `SELECT id FROM cnf_serverbox_height WHERE name = '2U' LIMIT 1`,
      );

      if (!generations?.[0]?.id || !heights?.[0]?.id) {
        throw new Error(
          "ER225HTR-M8 requires an M8 server generation and 2U server height",
        );
      }

      const sorts = await queryRunner.query(
        `SELECT COALESCE(MAX(sort), 0) + 10 AS next_sort FROM cnf_servers`,
      );

      serverId = randomUUID();
      await queryRunner.query(
        `
          INSERT INTO cnf_servers (
            id,
            name,
            description,
            serverbox_height_id,
            server_generation_id,
            price,
            sort
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          serverId,
          PLATFORM_CODE,
          PLATFORM_DESCRIPTION,
          heights[0].id,
          generations[0].id,
          15000,
          Number(sorts?.[0]?.next_sort || 10),
        ],
      );
    } else {
      await queryRunner.query(
        `
          UPDATE cnf_servers
          SET
            name = ?,
            description = ?,
            price = ?
          WHERE id = ?
        `,
        [PLATFORM_CODE, PLATFORM_DESCRIPTION, 15000, serverId],
      );
    }

    if (!profileId) {
      profileId = randomUUID();
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
          serverId,
          PLATFORM_CODE,
          "ER225HTR",
          "ocp_only",
          2,
          "DDR5",
          "5.0",
          80,
          160,
          0,
          0,
          8,
          360,
          2,
          2,
          true,
        ],
      );
    } else {
      await queryRunner.query(
        `
          UPDATE cnf_platform_profiles
          SET
            family = 'ER225HTR',
            mode = 'ocp_only',
            cpu_limit = 2,
            ram_type = 'DDR5',
            pcie_generation = '5.0',
            pcie_lanes_per_cpu = 80,
            pcie_lanes_total = 160,
            rear_pcie_ocp_limit = 0,
            pcie_slots = 0,
            ocp_slots = 8,
            base_power_w = 360,
            direct_sata_limit = 2,
            internal_m2_bays = 2,
            is_active = 1
          WHERE id = ?
        `,
        [profileId],
      );
    }

    const frontBays = await queryRunner.query(
      `
        SELECT id
        FROM cnf_platform_bays
        WHERE platform_profile_id = ?
          AND placement = 'front'
          AND bay_kind = 'drive'
        LIMIT 1
      `,
      [profileId],
    );

    if (frontBays?.[0]?.id) {
      await queryRunner.query(
        `
          UPDATE cnf_platform_bays
          SET
            form_factor = '2.5',
            capacity = 2,
            allowed_drive_types = ?,
            pcie_lanes_per_nvme = 4,
            counts_to_rear_pcie = 0
          WHERE id = ?
        `,
        [JSON.stringify(["SATA"]), frontBays[0].id],
      );
    } else {
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
          VALUES (?, ?, 'front', 'drive', '2.5', 2, ?, 4, 0)
        `,
        [randomUUID(), profileId, JSON.stringify(["SATA"])],
      );
    }

    for (const componentTypeKey of FORBIDDEN_COMPONENT_TYPES) {
      const existingRules = await queryRunner.query(
        `
          SELECT id
          FROM cnf_platform_forbidden_component_types
          WHERE platform_profile_id = ?
            AND component_type_key = ?
          LIMIT 1
        `,
        [profileId, componentTypeKey],
      );

      if (!existingRules?.[0]?.id) {
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
          [
            randomUUID(),
            profileId,
            componentTypeKey,
            "Запрещено для OCP-only платформы ER225HTR-M8",
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE cnf_platform_profiles SET is_active = 0 WHERE platform_code = ?`,
      [PLATFORM_CODE],
    );
  }
}
