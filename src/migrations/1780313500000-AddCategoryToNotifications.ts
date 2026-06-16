import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCategoryToNotifications1780313500000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn("notifications", "category");
    if (!hasColumn) {
      await queryRunner.addColumn(
        "notifications",
        new TableColumn({
          name: "category",
          type: "enum",
          enum: ["system", "company", "deal", "education"],
          default: "'system'",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn("notifications", "category");
    if (hasColumn) {
      await queryRunner.dropColumn("notifications", "category");
    }
  }
}
