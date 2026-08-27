import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddDealRegistrationExpiration1780320300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");
    if (!table) return;

    if (!table.findColumnByName("registration_expires_at")) {
      await queryRunner.addColumn(
        table,
        new TableColumn({
          name: "registration_expires_at",
          type: "datetime",
          isNullable: true,
        }),
      );
    }

    const refreshedTable = await queryRunner.getTable("deals");
    if (
      refreshedTable &&
      !refreshedTable.indices.some(
        (index) => index.name === "IDX_deals_registration_expiration",
      )
    ) {
      await queryRunner.createIndex(
        refreshedTable,
        new TableIndex({
          name: "IDX_deals_registration_expiration",
          columnNames: ["status", "registration_expires_at"],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("deals");
    if (!table) return;

    const index = table.indices.find(
      (entry) => entry.name === "IDX_deals_registration_expiration",
    );
    if (index) await queryRunner.dropIndex(table, index);

    if (table.findColumnByName("registration_expires_at")) {
      await queryRunner.dropColumn(table, "registration_expires_at");
    }
  }
}
