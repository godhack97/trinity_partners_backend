import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDealPurchaseDueEmailMarker1780315400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      "deals",
      "purchase_due_email_sent_at",
    );

    if (hasColumn) return;

    await queryRunner.addColumn(
      "deals",
      new TableColumn({
        name: "purchase_due_email_sent_at",
        type: "datetime",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      "deals",
      "purchase_due_email_sent_at",
    );

    if (!hasColumn) return;

    await queryRunner.dropColumn("deals", "purchase_due_email_sent_at");
  }
}
