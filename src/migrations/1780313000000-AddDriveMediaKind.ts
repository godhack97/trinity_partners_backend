import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDriveMediaKind1780313000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`SHOW COLUMNS FROM cnf_drive_profiles LIKE 'media_kind'`);

    if (!columns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_drive_profiles
        ADD COLUMN media_kind varchar(20) DEFAULT NULL AFTER interface_type
      `);
    }

    await queryRunner.query(`
      UPDATE cnf_drive_profiles dp
      JOIN cnf_components c ON c.id = dp.component_id
      SET dp.media_kind = CASE
        WHEN UPPER(dp.drive_type) IN ('NVME', 'M.2') THEN 'NVME'
        WHEN UPPER(c.name) LIKE '%NVME%' THEN 'NVME'
        WHEN UPPER(c.name) LIKE '%SSD%' OR UPPER(dp.speed_class) = 'SSD' THEN 'SSD'
        WHEN UPPER(c.name) LIKE '%HDD%' THEN 'HDD'
        WHEN UPPER(c.name) REGEXP '(^|[^0-9])(7\\\\.2K|10K|15K|RPM)([^0-9]|$)' THEN 'HDD'
        WHEN dp.form_factor = '3.5' AND UPPER(dp.drive_type) IN ('SATA', 'SAS') THEN 'HDD'
        ELSE NULL
      END
      WHERE dp.media_kind IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`SHOW COLUMNS FROM cnf_drive_profiles LIKE 'media_kind'`);

    if (columns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_drive_profiles
        DROP COLUMN media_kind
      `);
    }
  }
}
