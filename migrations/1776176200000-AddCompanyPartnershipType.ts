import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyPartnershipType1776176200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN partnership_type ENUM('integrator', 'distributor') NOT NULL DEFAULT 'integrator'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      DROP COLUMN partnership_type
    `);
  }
}
