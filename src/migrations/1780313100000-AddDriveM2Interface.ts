import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriveM2Interface1780313100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(
      `SHOW COLUMNS FROM cnf_drive_profiles LIKE 'm2_interface'`,
    );

    if (!columns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_drive_profiles
        ADD COLUMN m2_interface varchar(20) DEFAULT NULL AFTER interface_type
      `);
    }

    await queryRunner.query(`
      UPDATE cnf_drive_profiles dp
      JOIN cnf_components c ON c.id = dp.component_id
      SET dp.m2_interface = CASE
        WHEN UPPER(c.name) LIKE '%M.2%' AND UPPER(c.name) LIKE '%SATA%' THEN 'SATA'
        WHEN UPPER(c.name) LIKE '%M.2%' AND UPPER(c.name) LIKE '%NVME%' THEN 'NVME'
        WHEN UPPER(dp.drive_type) IN ('M.2', 'M2') AND UPPER(dp.interface_type) = 'SATA' THEN 'SATA'
        WHEN UPPER(dp.drive_type) IN ('M.2', 'M2') THEN 'NVME'
        ELSE dp.m2_interface
      END
      WHERE dp.m2_interface IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(
      `SHOW COLUMNS FROM cnf_drive_profiles LIKE 'm2_interface'`,
    );

    if (columns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_drive_profiles
        DROP COLUMN m2_interface
      `);
    }
  }
}
