import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddActionsToNotifications1749900400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasActions = await queryRunner.hasColumn("notifications", "actions");
    if (!hasActions) {
      await queryRunner.addColumn(
        "notifications",
        new TableColumn({
          name: "actions",
          type: "json",
          isNullable: true,
          default: null,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("notifications", "actions");
  }
}
