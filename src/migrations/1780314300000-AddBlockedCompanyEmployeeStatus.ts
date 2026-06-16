import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockedCompanyEmployeeStatus1780314300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_employees
      MODIFY COLUMN status enum('invited', 'pending', 'accept', 'reject', 'blocked', 'deleted') NOT NULL DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE company_employees SET status = 'deleted' WHERE status = 'blocked'
    `);
    await queryRunner.query(`
      ALTER TABLE company_employees
      MODIFY COLUMN status enum('invited', 'pending', 'accept', 'reject', 'deleted') NOT NULL DEFAULT 'pending'
    `);
  }
}
