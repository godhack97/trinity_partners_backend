import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDealAttachments1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");

    if (!table?.findColumnByName("attachments")) {
      await queryRunner.addColumn(
        "deals",
        new TableColumn({
          name: "attachments",
          type: "json",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");

    if (table?.findColumnByName("attachments")) {
      await queryRunner.dropColumn("deals", "attachments");
    }
  }
}
