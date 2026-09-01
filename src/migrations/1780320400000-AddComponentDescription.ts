import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComponentDescription1780320400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_components
        ADD COLUMN description text DEFAULT NULL AFTER name
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cnf_components
        DROP COLUMN description
    `);
  }
}
