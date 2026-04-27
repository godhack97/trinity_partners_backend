import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTicketIdToNotifications1749900600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn("notifications", "ticket_id");
    if (!hasColumn) {
      await queryRunner.addColumn(
        "notifications",
        new TableColumn({
          name: "ticket_id",
          type: "int",
          isNullable: true,
          default: null,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("notifications", "ticket_id");
  }
}
