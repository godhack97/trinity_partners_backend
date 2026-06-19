import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealIntegratorCompany1780315100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      ADD COLUMN integrator_company_id int NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE deals
      DROP COLUMN integrator_company_id
    `);
  }
}
