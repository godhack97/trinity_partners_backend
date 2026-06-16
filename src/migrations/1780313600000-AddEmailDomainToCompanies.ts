import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddEmailDomainToCompanies1780313600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn("companies", "email_domain");
    if (!hasColumn) {
      await queryRunner.addColumn(
        "companies",
        new TableColumn({
          name: "email_domain",
          type: "varchar",
          length: "255",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn("companies", "email_domain");
    if (hasColumn) {
      await queryRunner.dropColumn("companies", "email_domain");
    }
  }
}
