import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConfigurationsToDeals1776176300000
  implements MigrationInterface
{
  name = "AddConfigurationsToDeals1776176300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE deals ADD COLUMN configurations JSON NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE deals DROP COLUMN configurations`);
  }
}
