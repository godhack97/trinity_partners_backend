import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

const columns = [
  "purchase_reminder_7_days_sent_at",
  "purchase_reminder_3_days_sent_at",
  "purchase_reminder_1_day_sent_at",
  "purchase_due_web_notified_at",
];

export class AddDealPurchaseReminderMarkers1780315500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const columnName of columns) {
      const hasColumn = await queryRunner.hasColumn("deals", columnName);
      if (hasColumn) continue;

      await queryRunner.addColumn(
        "deals",
        new TableColumn({
          name: columnName,
          type: "datetime",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const columnName of [...columns].reverse()) {
      const hasColumn = await queryRunner.hasColumn("deals", columnName);
      if (!hasColumn) continue;

      await queryRunner.dropColumn("deals", columnName);
    }
  }
}
