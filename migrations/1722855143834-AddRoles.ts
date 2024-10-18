import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoles1722855143834 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO roles (name, description)
       VALUES ('super_admin', 'Cупер Админ'),
              ('employee_admin', 'сотрудник-администратор'),
              ('content_manager', 'контент-менеджер'),
              ('employee', 'Сотрудник'),
              ('partner', 'Партнер'); `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("SET FOREIGN_KEY_CHECKS = 0;");
    await queryRunner.query(`TRUNCATE roles;`);
    await queryRunner.query("SET FOREIGN_KEY_CHECKS = 1;");
  }
}
