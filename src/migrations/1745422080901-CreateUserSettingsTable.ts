import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateUserSettingsTable1745422080901
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "user_table_settings",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true, // Указываем, что это первичный ключ
            isGenerated: true, // Автоинкремент
            generationStrategy: "increment",
            isNullable: false,
          },
          {
            name: "user_id",
            type: "int unsigned", // Соответствует типу users.id
            isNullable: false,
          },
          {
            name: "table_id",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "data",
            type: "text", // Изменено на TEXT для больших данных
            isNullable: true,
          },
        ],
        indices: [
          {
            name: "IDX_user_table_settings_user_id",
            columnNames: ["user_id"], // Индекс для внешнего ключа
          },
          {
            name: "UNIQUE_user_table_settings_user_table",
            columnNames: ["user_id"], // Уникальный индекс для пары
            isUnique: true,
          },
        ],
        engine: "InnoDB",
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "user_table_settings",
      new TableForeignKey({
        name: "FK_user_table_settings_user_id",
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      "user_table_settings",
      "FK_user_table_settings_user_id",
    );
    await queryRunner.dropTable("user_table_settings");
  }
}
