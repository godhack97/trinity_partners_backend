import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealType1780314000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      ADD COLUMN deal_type enum('partner', 'trinity_staff') NOT NULL DEFAULT 'partner'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      DROP COLUMN deal_type
    `);
  }
}
