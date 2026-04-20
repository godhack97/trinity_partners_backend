import { MigrationInterface, QueryRunner, Table, TableColumn } from "typeorm";

export class CreateEventsAndRecommendedConfigsTables1749900100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Events table
    await queryRunner.createTable(
      new Table({
        name: "events",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "title", type: "varchar", length: "255" },
          { name: "description", type: "text", isNullable: true },
          { name: "date", type: "datetime" },
          { name: "end_date", type: "datetime", isNullable: true },
          { name: "link", type: "varchar", length: "500", isNullable: true },
          {
            name: "type",
            type: "enum",
            enum: ["webinar", "conference", "training", "other"],
            default: "'webinar'",
          },
          { name: "image", type: "varchar", length: "500", isNullable: true },
          { name: "is_active", type: "boolean", default: true },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
          { name: "deleted_at", type: "timestamp", isNullable: true },
        ],
      }),
      true,
    );

    // Recommended configs table
    await queryRunner.createTable(
      new Table({
        name: "recommended_configs",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "category", type: "varchar", length: "50" },
          { name: "category_label", type: "varchar", length: "100" },
          {
            name: "server_id",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          {
            name: "server_name",
            type: "varchar",
            length: "255",
            isNullable: true,
          },
          { name: "description", type: "text", isNullable: true },
          { name: "components", type: "json", isNullable: true },
          { name: "image", type: "varchar", length: "500", isNullable: true },
          { name: "is_active", type: "boolean", default: true },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
          { name: "deleted_at", type: "timestamp", isNullable: true },
        ],
      }),
      true,
    );

    // Add partner_level and certificate_expiry to companies
    await queryRunner.addColumns("companies", [
      new TableColumn({
        name: "partner_level",
        type: "enum",
        enum: ["bronze", "silver", "gold", "platinum"],
        isNullable: true,
        comment: "Уровень партнёра",
      }),
      new TableColumn({
        name: "certificate_expiry",
        type: "date",
        isNullable: true,
        comment: "Срок действия сертификата",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("companies", "certificate_expiry");
    await queryRunner.dropColumn("companies", "partner_level");
    await queryRunner.dropTable("recommended_configs");
    await queryRunner.dropTable("events");
  }
}
