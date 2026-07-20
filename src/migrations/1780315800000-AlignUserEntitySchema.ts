import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from "typeorm";

export class AlignUserEntitySchema1780315800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: TableColumn[] = [
      new TableColumn({
        name: "manager_id",
        type: "int",
        unsigned: true,
        isNullable: true,
        comment: "ID ответственного менеджера",
      }),
      new TableColumn({
        name: "bitrix24_contact_id",
        type: "int",
        unsigned: true,
        isNullable: true,
        comment: "ID контакта в Bitrix24",
      }),
      new TableColumn({
        name: "bitrix24_sync_status",
        type: "enum",
        enum: ["pending", "synced", "failed"],
        default: "'pending'",
        isNullable: true,
        comment: "Статус синхронизации контакта с Bitrix24",
      }),
      new TableColumn({
        name: "bitrix24_synced_at",
        type: "timestamp",
        isNullable: true,
        comment: "Время последней синхронизации контакта с Bitrix24",
      }),
      new TableColumn({
        name: "lastActivity",
        type: "json",
        isNullable: true,
      }),
    ];

    for (const column of columns) {
      if (!(await queryRunner.hasColumn("users", column.name))) {
        await queryRunner.addColumn("users", column);
      }
    }

    const usersTable = await queryRunner.getTable("users");
    const hasManagerForeignKey = usersTable?.foreignKeys.some((foreignKey) =>
      foreignKey.columnNames.includes("manager_id"),
    );

    if (!hasManagerForeignKey) {
      await queryRunner.createForeignKey(
        "users",
        new TableForeignKey({
          name: "users_manager_fk",
          columnNames: ["manager_id"],
          referencedTableName: "users",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        }),
      );
    }
  }

  // These columns already exist outside the historical migration chain on
  // deployed databases. Removing them during rollback would destroy live data.
  public async down(): Promise<void> {}
}
