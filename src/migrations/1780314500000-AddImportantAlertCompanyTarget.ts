import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImportantAlertCompanyTarget1780314500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE important_alerts
      ADD COLUMN target_company_id int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE important_alerts
      DROP COLUMN target_company_id
    `);
  }
}
