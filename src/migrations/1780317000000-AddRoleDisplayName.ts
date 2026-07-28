import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRoleDisplayName1780317000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("roles", "display_name"))) {
      await queryRunner.addColumn(
        "roles",
        new TableColumn({
          name: "display_name",
          type: "varchar",
          length: "255",
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(`
      UPDATE roles
      SET display_name = CASE
        WHEN name IN (
          'super_admin', 'employee', 'employee_admin', 'content_manager',
          'partner_manager', 'partner', 'company_admin', 'sales_manager',
          'technical_specialist', 'staff'
        ) THEN COALESCE(NULLIF(description, ''), name)
        ELSE name
      END
      WHERE display_name IS NULL OR display_name = ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("roles", "display_name")) {
      await queryRunner.dropColumn("roles", "display_name");
    }
  }
}
