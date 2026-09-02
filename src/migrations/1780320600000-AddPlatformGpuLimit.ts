import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformGpuLimit1780320600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_platform_profiles
      ADD COLUMN gpu_limit int DEFAULT NULL AFTER cpu_limit
    `);

    await queryRunner.query(`
      UPDATE cnf_platform_profiles
      SET gpu_limit = 8
      WHERE UPPER(platform_code) LIKE '%TSGM240%'
         OR UPPER(family) LIKE '%TSGM240%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_platform_profiles
      DROP COLUMN gpu_limit
    `);
  }
}
