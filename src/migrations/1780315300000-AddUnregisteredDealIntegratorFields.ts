import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnregisteredDealIntegratorFields1780315300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");
    const columns = new Set(table?.columns.map((column) => column.name) || []);

    if (!columns.has("integrator_name")) {
      await queryRunner.query(
        `ALTER TABLE deals ADD COLUMN integrator_name varchar(255) NULL`,
      );
    }

    if (!columns.has("integrator_inn")) {
      await queryRunner.query(
        `ALTER TABLE deals ADD COLUMN integrator_inn varchar(32) NULL`,
      );
    }

    if (!columns.has("bitrix24_integrator_contact_id")) {
      await queryRunner.query(
        `ALTER TABLE deals ADD COLUMN bitrix24_integrator_contact_id int unsigned NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");
    const columns = new Set(table?.columns.map((column) => column.name) || []);

    if (columns.has("bitrix24_integrator_contact_id")) {
      await queryRunner.query(
        `ALTER TABLE deals DROP COLUMN bitrix24_integrator_contact_id`,
      );
    }

    if (columns.has("integrator_inn")) {
      await queryRunner.query(`ALTER TABLE deals DROP COLUMN integrator_inn`);
    }

    if (columns.has("integrator_name")) {
      await queryRunner.query(`ALTER TABLE deals DROP COLUMN integrator_name`);
    }
  }
}
