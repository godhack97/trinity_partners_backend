import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketAssignee1780314400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tickets
      ADD COLUMN assignee_id int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tickets
      DROP COLUMN assignee_id
    `);
  }
}
