import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformPsuCount1780321500000 implements MigrationInterface {
  name = "AddPlatformPsuCount1780321500000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_platform_profiles
      ADD COLUMN psu_count int DEFAULT NULL AFTER base_power_w
    `);

    await queryRunner.query(`
      UPDATE cnf_platform_profiles
      SET psu_count = 4
      WHERE UPPER(platform_code) LIKE '%TSGM240%'
         OR UPPER(family) LIKE '%TSGM240%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_platform_profiles
      DROP COLUMN psu_count
    `);
  }
}
