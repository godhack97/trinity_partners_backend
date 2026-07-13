import { MigrationInterface, QueryRunner } from "typeorm";

export class AddControllerM2Slots1780313200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const slotColumns = await queryRunner.query(
      `SHOW COLUMNS FROM cnf_controller_profiles LIKE 'm2_slot_count'`,
    );

    if (!slotColumns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_controller_profiles
        ADD COLUMN m2_slot_count int NOT NULL DEFAULT 0 AFTER internal_ports
      `);
    }

    const typeColumns = await queryRunner.query(
      `SHOW COLUMNS FROM cnf_controller_profiles LIKE 'm2_drive_type'`,
    );

    if (!typeColumns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_controller_profiles
        ADD COLUMN m2_drive_type varchar(20) DEFAULT NULL AFTER m2_slot_count
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const typeColumns = await queryRunner.query(
      `SHOW COLUMNS FROM cnf_controller_profiles LIKE 'm2_drive_type'`,
    );

    if (typeColumns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_controller_profiles
        DROP COLUMN m2_drive_type
      `);
    }

    const slotColumns = await queryRunner.query(
      `SHOW COLUMNS FROM cnf_controller_profiles LIKE 'm2_slot_count'`,
    );

    if (slotColumns?.length) {
      await queryRunner.query(`
        ALTER TABLE cnf_controller_profiles
        DROP COLUMN m2_slot_count
      `);
    }
  }
}
