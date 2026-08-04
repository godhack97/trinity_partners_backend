import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealDraftStatus1780317200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      MODIFY COLUMN status
      ENUM('draft', 'registered', 'canceled', 'moderation', 'win', 'loose')
      NOT NULL DEFAULT 'draft'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE deals SET status = 'moderation' WHERE status = 'draft'`,
    );
    await queryRunner.query(`
      ALTER TABLE deals
      MODIFY COLUMN status
      ENUM('registered', 'canceled', 'moderation', 'win', 'loose')
      NOT NULL DEFAULT 'moderation'
    `);
  }
}
