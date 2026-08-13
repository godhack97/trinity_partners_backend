import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVendorPartnershipType1780317900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      MODIFY COLUMN partnership_type enum('integrator', 'distributor', 'vendor')
      NOT NULL DEFAULT 'integrator'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE companies
      SET partnership_type = 'integrator'
      WHERE partnership_type = 'vendor'
    `);
    await queryRunner.query(`
      ALTER TABLE companies
      MODIFY COLUMN partnership_type enum('integrator', 'distributor')
      NOT NULL DEFAULT 'integrator'
    `);
  }
}
