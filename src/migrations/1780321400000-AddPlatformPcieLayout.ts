import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformPcieLayout1780321400000
  implements MigrationInterface
{
  name = "AddPlatformPcieLayout1780321400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_platform_profiles
      ADD COLUMN pcie_layout_mode varchar(32) NOT NULL DEFAULT 'standard' AFTER pcie_slots,
      ADD COLUMN wide_pcie_slots int DEFAULT NULL AFTER pcie_layout_mode
    `);

    await queryRunner.query(`
      UPDATE cnf_platform_profiles
      SET
        pcie_slots = 12,
        pcie_layout_mode = 'spaced',
        wide_pcie_slots = 8,
        gpu_limit = COALESCE(gpu_limit, 8)
      WHERE UPPER(platform_code) LIKE '%TSGM240%'
         OR UPPER(family) LIKE '%TSGM240%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_platform_profiles
      DROP COLUMN wide_pcie_slots,
      DROP COLUMN pcie_layout_mode
    `);
  }
}
