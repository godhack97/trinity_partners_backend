import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyValidationManager1780314600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      ADD COLUMN validated_by_manager_id int NULL,
      ADD COLUMN validated_at timestamp NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE companies
      DROP COLUMN validated_at,
      DROP COLUMN validated_by_manager_id
    `);
  }
}
