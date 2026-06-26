import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDealComments1780315200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");
    const hasColumn = table?.columns.some((column) => column.name === "comments");

    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE deals ADD COLUMN comments JSON NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");
    const hasColumn = table?.columns.some((column) => column.name === "comments");

    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE deals DROP COLUMN comments`);
    }
  }
}
