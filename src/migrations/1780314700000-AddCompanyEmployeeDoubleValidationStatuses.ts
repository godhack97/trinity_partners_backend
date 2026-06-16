import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyEmployeeDoubleValidationStatuses1780314700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE company_employees
      MODIFY COLUMN status enum('invited', 'pending', 'trinity_pending', 'invite_trinity_pending', 'company_pending', 'accept', 'reject', 'blocked', 'deleted') NOT NULL DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE company_employees SET status = 'pending' WHERE status IN ('trinity_pending', 'invite_trinity_pending', 'company_pending')
    `);
    await queryRunner.query(`
      ALTER TABLE company_employees
      MODIFY COLUMN status enum('invited', 'pending', 'accept', 'reject', 'blocked', 'deleted') NOT NULL DEFAULT 'pending'
    `);
  }
}
