import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuspendedCompanyStatus1780313700000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      MODIFY COLUMN status enum('pending', 'accept', 'reject', 'suspended') NOT NULL DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE companies SET status = 'reject' WHERE status = 'suspended'
    `);
    await queryRunner.query(`
      ALTER TABLE companies
      MODIFY COLUMN status enum('pending', 'accept', 'reject') NOT NULL DEFAULT 'pending'
    `);
  }
}
